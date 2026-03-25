use tauri::command;
use uuid::Uuid;
use chrono::Utc;

use crate::db::queries;
use crate::models::*;
use crate::state::AppState;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCardInput {
    pub headword: String,
    pub language: String,
    pub source_entry_ids: Vec<String>,
    pub override_answer_text: Option<String>,
    pub override_example_text: Option<String>,
    pub notes: Option<String>,
    pub collection_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCardInput {
    pub card_id: String,
    pub language: String,
    pub headword: String,
    pub answer_text: String,
    pub example_text: Option<String>,
    pub notes: Option<String>,
    pub audio_reference: Option<String>,
    pub source_entry_ids: Option<Vec<String>>,
    pub collection_ids: Option<Vec<String>>,
}

#[command]
pub async fn create_card_from_headword_detail(
    input: CreateCardInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.headword.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("headword is required")).unwrap());
    }
    if input.language.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("language is required")).unwrap());
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    // Check for existing card with same headword + language
    match queries::fetch_card_by_headword_language(&conn, &input.headword, &input.language) {
        Ok(Some(existing)) => {
            return Ok(serde_json::to_value(ConflictFailure::new(
                format!("A card for '{}' in {} already exists.", input.headword, input.language),
                existing.id,
            )).unwrap());
        }
        Err(e) => {
            return Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap());
        }
        Ok(None) => {}
    }

    // Resolve answer text: use override if given, otherwise try to look up detail
    let answer_text = input.override_answer_text.unwrap_or_else(|| {
        // Fallback: fetch entries by IDs and concat definition_text
        // For simplicity in MVP, require override_answer_text from the detail page
        String::new()
    });

    if answer_text.is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("answerText is required")).unwrap());
    }

    let now = Utc::now().to_rfc3339();
    let card_id = Uuid::new_v4().to_string();

    let card = Card {
        id: card_id.clone(),
        language: input.language.clone(),
        headword: input.headword.clone(),
        answer_text,
        example_text: input.override_example_text,
        notes: input.notes,
        audio_reference: None,
        source_entry_ids: input.source_entry_ids,
        learning_status: "unreviewed".to_string(),
        created_at: now.clone(),
        updated_at: now.clone(),
        last_reviewed_at: None,
    };

    if let Err(e) = queries::insert_card(&conn, &card) {
        if e.to_string().contains("UNIQUE constraint failed") {
            // Race condition: someone else inserted in the meantime
            if let Ok(Some(existing)) = queries::fetch_card_by_headword_language(&conn, &card.headword, &card.language) {
                return Ok(serde_json::to_value(ConflictFailure::new(
                    format!("A card for '{}' in {} already exists.", card.headword, card.language),
                    existing.id,
                )).unwrap());
            }
        }
        return Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap());
    }

    // Add collection memberships if provided
    if let Some(collection_ids) = input.collection_ids {
        if !collection_ids.is_empty() {
            if let Err(e) = queries::replace_card_memberships(&conn, &card_id, &collection_ids, &now) {
                log::warn!("Failed to set collection memberships for card {}: {}", card_id, e);
            }
        }
    }

    Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
        "cardId": card_id,
        "learningStatus": "unreviewed",
    }))).unwrap())
}

#[command]
pub async fn update_card(
    input: UpdateCardInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    let existing = match queries::fetch_card_by_id(&conn, &input.card_id) {
        Ok(Some(c)) => c,
        Ok(None) => return Ok(serde_json::to_value(CommandFailure::not_found("Card not found")).unwrap()),
        Err(e) => return Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    };

    let now = Utc::now().to_rfc3339();

    let updated = Card {
        id: input.card_id.clone(),
        language: input.language,
        headword: input.headword,
        answer_text: input.answer_text,
        example_text: input.example_text,
        notes: input.notes,
        audio_reference: input.audio_reference,
        source_entry_ids: input.source_entry_ids.unwrap_or(existing.source_entry_ids),
        learning_status: existing.learning_status,
        created_at: existing.created_at,
        updated_at: now.clone(),
        last_reviewed_at: existing.last_reviewed_at,
    };

    if let Err(e) = queries::update_card_row(&conn, &updated) {
        return Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap());
    }

    // Replace collection memberships
    if let Some(collection_ids) = input.collection_ids {
        if let Err(e) = queries::replace_card_memberships(&conn, &input.card_id, &collection_ids, &now) {
            log::warn!("Failed to update collection memberships: {}", e);
        }
    }

    Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
        "cardId": input.card_id,
        "updatedAt": now,
    }))).unwrap())
}

#[command]
pub async fn get_card(
    card_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    match queries::fetch_card_by_id(&conn, &card_id) {
        Ok(Some(card)) => {
            let collection_ids = queries::fetch_card_collection_ids(&conn, &card_id).unwrap_or_default();
            Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
                "id": card.id,
                "language": card.language,
                "headword": card.headword,
                "answerText": card.answer_text,
                "exampleText": card.example_text,
                "notes": card.notes,
                "audioReference": card.audio_reference,
                "sourceEntryIds": card.source_entry_ids,
                "learningStatus": card.learning_status,
                "collectionIds": collection_ids,
                "createdAt": card.created_at,
                "updatedAt": card.updated_at,
            }))).unwrap())
        }
        Ok(None) => Ok(serde_json::to_value(CommandFailure::not_found("Card not found")).unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn list_cards(
    collection_id: Option<String>,
    learning_status: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    match queries::fetch_all_cards(&conn, collection_id.as_deref(), learning_status.as_deref()) {
        Ok(cards) => {
            let output: Vec<serde_json::Value> = cards.iter().map(|c| {
                let collection_ids = queries::fetch_card_collection_ids(&conn, &c.id).unwrap_or_default();
                serde_json::json!({
                    "id": c.id,
                    "language": c.language,
                    "headword": c.headword,
                    "answerText": c.answer_text,
                    "learningStatus": c.learning_status,
                    "collectionIds": collection_ids,
                })
            }).collect();
            Ok(serde_json::to_value(CommandSuccess::new(output)).unwrap())
        }
        Err(e) => Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn delete_card(
    card_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::delete_card_row(&conn, &card_id) {
        Ok(0) => Ok(serde_json::to_value(CommandFailure::not_found("Card not found")).unwrap()),
        Ok(_) => Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "deletedCardId": card_id,
        }))).unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap()),
    }
}
