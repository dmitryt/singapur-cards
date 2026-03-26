use tauri::command;
use chrono::Utc;

use crate::db::queries;
use crate::models::*;
use crate::state::AppState;

#[command]
pub async fn list_languages(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::fetch_all_languages(&conn) {
        Ok(langs) => {
            let output: Vec<serde_json::Value> = langs.iter().map(|l| serde_json::json!({
                "code": l.code,
                "title": l.title,
                "createdAt": l.created_at,
            })).collect();
            Ok(serde_json::to_value(CommandSuccess::new(output)).unwrap())
        }
        Err(e) => Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn create_language(
    input: CreateLanguageInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.code.len() != 2 || !input.code.chars().all(|c| c.is_ascii_lowercase()) {
        return Ok(serde_json::to_value(CommandFailure::invalid_input(
            "Language code must be exactly 2 lowercase ASCII letters (e.g. \"en\", \"de\")."
        )).unwrap());
    }
    if input.title.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("title is required")).unwrap());
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    if let Err(e) = queries::insert_language(&conn, &input.code, &input.title, &now) {
        if e.to_string().contains("UNIQUE constraint failed") || e.to_string().contains("PRIMARY KEY constraint failed") {
            return Ok(serde_json::to_value(CommandFailure::new(
                "CONFLICT",
                format!("A language with code '{}' already exists.", input.code),
            )).unwrap());
        }
        return Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap());
    }

    Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
        "code": input.code,
        "title": input.title,
        "createdAt": now,
    }))).unwrap())
}

#[command]
pub async fn update_language(
    input: UpdateLanguageInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.title.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("title is required")).unwrap());
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::update_language_title(&conn, &input.code, &input.title) {
        Ok(0) => Ok(serde_json::to_value(CommandFailure::not_found("Language not found")).unwrap()),
        Ok(_) => Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "code": input.code,
            "title": input.title,
        }))).unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn delete_language(
    code: String,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    match queries::fetch_language_count(&conn) {
        Ok(count) if count <= 1 => {
            return Ok(serde_json::to_value(CommandFailure::invalid_input(
                "Cannot delete the last language."
            )).unwrap());
        }
        Err(e) => return Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
        _ => {}
    }

    match queries::delete_language(&conn, &code) {
        Ok(0) => Ok(serde_json::to_value(CommandFailure::not_found("Language not found")).unwrap()),
        Ok(_) => Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "deletedCode": code,
        }))).unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn list_headwords_for_language(
    language: String,
    limit: Option<i64>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let effective_limit = limit.unwrap_or(2000);
    match queries::list_headwords_for_language(&conn, &language, effective_limit) {
        Ok(headwords) => Ok(serde_json::to_value(CommandSuccess::new(headwords)).unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    }
}
