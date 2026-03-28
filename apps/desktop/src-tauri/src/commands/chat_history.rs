use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::command;
use uuid::Uuid;

use crate::db::queries;
use crate::models::{CommandFailure, CommandSuccess};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChatConversationInput {
    pub model: Option<String>,
    pub collection_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetChatMessagesInput {
    pub conversation_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteChatConversationInput {
    pub conversation_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatConversationSummary {
    pub id: String,
    pub title: String,
    pub updated_at: String,
    pub model: Option<String>,
    pub collection_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageDto {
    pub id: String,
    pub role: String,
    pub body: String,
    pub metadata_json: Option<String>,
    pub created_at: String,
}

#[command]
pub async fn create_chat_conversation(
    input: CreateChatConversationInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let model = input.model.as_deref().filter(|s| !s.trim().is_empty());
    let collection_id = input
        .collection_id
        .as_deref()
        .filter(|s| !s.trim().is_empty());

    queries::insert_chat_conversation(
        &conn,
        &id,
        model,
        collection_id,
        &now,
        &now,
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
        "id": id,
    })))
    .unwrap())
}

#[command]
pub async fn list_chat_conversations(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let rows = queries::list_chat_conversations(&conn).map_err(|e| e.to_string())?;
    let list: Vec<ChatConversationSummary> = rows
        .into_iter()
        .map(|r| ChatConversationSummary {
            id: r.id,
            title: r.title,
            updated_at: r.updated_at,
            model: r.model,
            collection_id: r.collection_id,
        })
        .collect();

    Ok(serde_json::to_value(CommandSuccess::new(list)).unwrap())
}

#[command]
pub async fn get_chat_messages(
    input: GetChatMessagesInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.conversation_id.trim().is_empty() {
        return Ok(
            serde_json::to_value(CommandFailure::invalid_input("conversationId is required")).unwrap(),
        );
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    if !queries::chat_conversation_exists(&conn, &input.conversation_id).map_err(|e| e.to_string())? {
        return Ok(serde_json::to_value(CommandFailure::not_found(
            "Conversation not found.",
        ))
        .unwrap());
    }

    let rows = queries::fetch_chat_messages(&conn, &input.conversation_id).map_err(|e| e.to_string())?;
    let messages: Vec<ChatMessageDto> = rows
        .into_iter()
        .map(|r| ChatMessageDto {
            id: r.id,
            role: r.role,
            body: r.body,
            metadata_json: r.metadata_json,
            created_at: r.created_at,
        })
        .collect();

    Ok(serde_json::to_value(CommandSuccess::new(messages)).unwrap())
}

#[command]
pub async fn delete_chat_conversation(
    input: DeleteChatConversationInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.conversation_id.trim().is_empty() {
        return Ok(
            serde_json::to_value(CommandFailure::invalid_input("conversationId is required")).unwrap(),
        );
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    match queries::delete_chat_conversation_row(&conn, &input.conversation_id) {
        Ok(0) => Ok(serde_json::to_value(CommandFailure::not_found(
            "Conversation not found.",
        ))
        .unwrap()),
        Ok(_) => Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "deletedConversationId": input.conversation_id,
        })))
        .unwrap()),
        Err(e) => Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap()),
    }
}
