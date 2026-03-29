use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::command;
use uuid::Uuid;

use crate::db::queries;
use crate::models::{CommandFailure, CommandSuccess};
use crate::state::AppState;

// ── Input / Output types ──────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedModelOutput {
    pub name: String,
    pub title: String,
    pub provider: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddCustomModelInput {
    pub name: String,
    pub title: String,
    pub provider: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCustomModelInput {
    pub name: String,
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[command]
pub async fn list_custom_models(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::list_custom_models(&conn) {
        Ok(rows) => {
            let items: Vec<SavedModelOutput> = rows
                .into_iter()
                .map(|r| SavedModelOutput {
                    name: r.name,
                    title: r.title,
                    provider: r.provider,
                })
                .collect();
            Ok(serde_json::to_value(CommandSuccess::new(items)).unwrap())
        }
        Err(e) => Ok(
            serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap(),
        ),
    }
}

#[command]
pub async fn add_custom_model(
    input: AddCustomModelInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let normalized_name = input.name.trim().to_lowercase();
    let trimmed_title = input.title.trim().to_string();
    let trimmed_provider = input.provider.trim().to_string();

    if normalized_name.is_empty() {
        return Ok(
            serde_json::to_value(CommandFailure::invalid_input("name is required")).unwrap(),
        );
    }
    if trimmed_title.is_empty() {
        return Ok(
            serde_json::to_value(CommandFailure::invalid_input("title is required")).unwrap(),
        );
    }
    if trimmed_provider.is_empty() {
        return Ok(
            serde_json::to_value(CommandFailure::invalid_input("provider is required")).unwrap(),
        );
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Store the trimmed (not lowercased) name for display fidelity; uniqueness is on LOWER(name)
    let stored_name = input.name.trim().to_string();

    match queries::insert_custom_model(&conn, &new_id, &stored_name, &trimmed_title, &trimmed_provider, &now) {
        Ok(()) => Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "name": stored_name,
            "title": trimmed_title,
            "provider": trimmed_provider,
        })))
        .unwrap()),
        Err(e) => {
            let msg = e.to_string();
            if msg.contains("UNIQUE") {
                Ok(serde_json::to_value(CommandFailure::new(
                    "CONFLICT",
                    "A saved model with this identifier already exists",
                ))
                .unwrap())
            } else {
                Ok(
                    serde_json::to_value(CommandFailure::unexpected_error(msg)).unwrap(),
                )
            }
        }
    }
}

#[command]
pub async fn delete_custom_model(
    input: DeleteCustomModelInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.name.trim().is_empty() {
        return Ok(
            serde_json::to_value(CommandFailure::invalid_input("name is required")).unwrap(),
        );
    }
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::delete_custom_model(&conn, &input.name) {
        Ok(_) => Ok(
            serde_json::to_value(CommandSuccess::new(serde_json::json!({ "ok": true }))).unwrap(),
        ),
        Err(e) => Ok(
            serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap(),
        ),
    }
}
