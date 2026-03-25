use tauri::command;
use uuid::Uuid;
use chrono::Utc;

use crate::db::queries;
use crate::models::*;
use crate::state::AppState;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollectionInput {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameCollectionInput {
    pub collection_id: String,
    pub new_name: String,
}

#[command]
pub async fn create_collection(
    input: CreateCollectionInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.name.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("name is required")).unwrap());
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let coll_id = Uuid::new_v4().to_string();

    let coll = Collection {
        id: coll_id.clone(),
        name: input.name.clone(),
        description: input.description,
        created_at: now.clone(),
        updated_at: now,
    };

    if let Err(e) = queries::insert_collection(&conn, &coll) {
        if e.to_string().contains("UNIQUE constraint failed") {
            return Ok(serde_json::to_value(CommandFailure::invalid_input(
                format!("A collection named '{}' already exists.", input.name)
            )).unwrap());
        }
        return Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap());
    }

    Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
        "collectionId": coll_id,
        "name": coll.name,
    }))).unwrap())
}

#[command]
pub async fn list_collections(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::fetch_all_collections(&conn) {
        Ok(colls) => {
            let output: Vec<serde_json::Value> = colls.iter().map(|(c, card_count)| serde_json::json!({
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "cardCount": card_count,
            })).collect();
            Ok(serde_json::to_value(CommandSuccess::new(output)).unwrap())
        }
        Err(e) => Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn rename_collection(
    input: RenameCollectionInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.new_name.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("newName is required")).unwrap());
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    match queries::update_collection_name(&conn, &input.collection_id, &input.new_name, &now) {
        Ok(0) => Ok(serde_json::to_value(CommandFailure::not_found("Collection not found")).unwrap()),
        Ok(_) => Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "collectionId": input.collection_id,
            "name": input.new_name,
            "updatedAt": now,
        }))).unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap()),
    }
}

#[command]
pub async fn delete_collection(
    collection_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::delete_collection_row(&conn, &collection_id) {
        Ok(0) => Ok(serde_json::to_value(CommandFailure::not_found("Collection not found")).unwrap()),
        Ok(_) => Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "deletedCollectionId": collection_id,
        }))).unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap()),
    }
}
