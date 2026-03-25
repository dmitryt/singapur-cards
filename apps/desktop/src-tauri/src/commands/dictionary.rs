use tauri::command;
use tauri::ipc::Channel;
use uuid::Uuid;
use chrono::Utc;

use crate::db::queries;
use crate::dsl::importer::import_dsl_file;
use crate::dsl::parser::normalize_headword;
use crate::models::*;
use crate::state::AppState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportDictionaryInput {
    pub file_path: String,
    pub display_name: Option<String>,
    pub language_from: String,
    pub language_to: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportDictionaryOutput {
    pub dictionary_id: String,
    pub name: String,
    pub language_from: String,
    pub language_to: String,
    pub import_status: String,
    pub entry_count: i64,
    pub skipped_entry_count: i64,
    pub warnings: Option<String>,
}


#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHeadwordsInput {
    pub query: String,
    pub search_language: Option<String>,
    pub dictionary_ids: Option<Vec<String>>,
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetHeadwordDetailInput {
    pub headword: String,
    pub language: String,
}

#[command]
pub async fn import_dictionary(
    input: ImportDictionaryInput,
    on_progress: Channel<ImportProgressEvent>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.language_from.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("languageFrom is required")).unwrap());
    }
    if input.language_to.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("languageTo is required")).unwrap());
    }

    let source_filename = std::path::Path::new(&input.file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let display_name = input.display_name.unwrap_or_else(|| {
        source_filename
            .trim_end_matches(".dsl")
            .trim_end_matches(".DSL")
            .to_string()
    });

    let dict_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Parse the file with progress streaming.
    // Return a structured command failure instead of transport-level Err so the UI can
    // reliably exit "importing" state.
    let import_result = match import_dsl_file(&input.file_path, &on_progress) {
        Ok(result) => result,
        Err(error) => {
            return Ok(
                serde_json::to_value(CommandFailure::file_read_failed(error)).unwrap()
            );
        }
    };

    if import_result.entries.is_empty() && import_result.skipped_entry_count == 0 {
        return Ok(serde_json::to_value(CommandFailure::parse_failed(
            "The file contained no parseable dictionary entries."
        )).unwrap());
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    // Insert dictionary record
    let dict = Dictionary {
        id: dict_id.clone(),
        name: display_name.clone(),
        language_from: input.language_from.clone(),
        language_to: input.language_to.clone(),
        source_filename: source_filename.clone(),
        source_path: Some(input.file_path.clone()),
        import_status: "importing".to_string(),
        entry_count: 0,
        last_error: None,
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    if let Err(e) = queries::insert_dictionary(&conn, &dict) {
        if e.to_string().contains("UNIQUE constraint failed") {
            return Ok(serde_json::to_value(CommandFailure::invalid_input(
                format!("A dictionary named '{}' already exists.", display_name)
            )).unwrap());
        }
        return Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap());
    }

    // Insert all entries
    let mut entry_count: i64 = 0;
    for (source_order, parsed) in import_result.entries.iter().enumerate() {
        for headword in &parsed.headwords {
            let entry = DictionaryEntry {
                id: Uuid::new_v4().to_string(),
                dictionary_id: dict_id.clone(),
                headword: headword.clone(),
                normalized_headword: normalize_headword(headword),
                transcription: parsed.transcription.clone(),
                definition_text: parsed.definition_text.clone(),
                example_text: parsed.example_text.clone(),
                audio_reference: None,
                source_order: source_order as i64,
                created_at: now.clone(),
            };
            if let Err(e) = queries::insert_dictionary_entry(&conn, &entry) {
                log::warn!("Failed to insert entry '{}': {}", headword, e);
                continue;
            }
            entry_count += 1;
        }
    }

    // Update status to ready
    let updated_at = Utc::now().to_rfc3339();
    if let Err(e) = queries::update_dictionary_status(&conn, &dict_id, "ready", entry_count, None, &updated_at) {
        return Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap());
    }

    Ok(serde_json::to_value(CommandSuccess::new(ImportDictionaryOutput {
        dictionary_id: dict_id,
        name: display_name,
        language_from: input.language_from,
        language_to: input.language_to,
        import_status: "ready".to_string(),
        entry_count,
        skipped_entry_count: import_result.skipped_entry_count as i64,
        warnings: import_result.warnings,
    })).unwrap())
}

#[command]
pub async fn list_dictionaries(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::fetch_all_dictionaries(&conn) {
        Ok(dicts) => {
            let output: Vec<serde_json::Value> = dicts.iter().map(|d| serde_json::json!({
                "id": d.id,
                "name": d.name,
                "languageFrom": d.language_from,
                "languageTo": d.language_to,
                "importStatus": d.import_status,
                "entryCount": d.entry_count,
            })).collect();
            Ok(serde_json::to_value(CommandSuccess::new(output)).unwrap())
        }
        Err(e) => Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn remove_dictionary(
    dictionary_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::delete_dictionary(&conn, &dictionary_id) {
        Ok(0) => Ok(serde_json::to_value(CommandFailure::not_found("Dictionary not found")).unwrap()),
        Ok(_) => Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "removedDictionaryId": dictionary_id
        }))).unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn search_headwords(
    input: SearchHeadwordsInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.query.trim().is_empty() {
        return Ok(serde_json::to_value(CommandSuccess::new(Vec::<serde_json::Value>::new())).unwrap());
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let limit = input.limit.unwrap_or(50);

    match queries::search_headwords(
        &conn,
        &input.query,
        input.search_language.as_deref(),
        input.dictionary_ids.as_deref(),
        limit,
    ) {
        Ok(results) => {
            let output: Vec<serde_json::Value> = results.iter().map(|r| serde_json::json!({
                "headword": r.headword,
                "language": r.language,
                "sourceEntryIds": r.source_entry_ids,
                "previewText": r.preview_text,
                "matchKind": r.match_kind,
                "contributingDictionaryCount": r.contributing_dictionary_count,
            })).collect();
            Ok(serde_json::to_value(CommandSuccess::new(output)).unwrap())
        }
        Err(e) => Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn get_headword_detail(
    input: GetHeadwordDetailInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::get_headword_detail(&conn, &input.headword, &input.language) {
        Ok(Some(detail)) => Ok(serde_json::to_value(CommandSuccess::new(detail)).unwrap()),
        Ok(None) => Ok(serde_json::to_value(CommandFailure::not_found(
            format!("No entries found for headword '{}' in language '{}'", input.headword, input.language)
        )).unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    }
}
