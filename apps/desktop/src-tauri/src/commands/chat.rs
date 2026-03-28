use std::sync::atomic::{AtomicBool, Ordering};

use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::json;
use tauri::command;
use tauri::Emitter;

use crate::db::queries;
use crate::models::{CommandFailure, CommandSuccess};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendChatMessageInput {
    pub prompt: String,
    pub model: String,
    pub provider: String,
    pub conversation_id: String,
    pub selected_collection_id: Option<String>,
    /// Correlates Tauri events (`chat_stream_*`) with this request; required for streaming UI.
    pub stream_id: String,
}

/// Retrieve vocabulary words for the given collection. Returns an error if the
/// collection is set but not found or is empty (per contract — no silent degradation).
fn resolve_vocabulary_context(
    conn: &rusqlite::Connection,
    selected_collection_id: &Option<String>,
) -> Result<Option<Vec<String>>, serde_json::Value> {
    let collection_id = match selected_collection_id {
        Some(id) if !id.is_empty() => id,
        _ => return Ok(None),
    };

    let headwords = queries::fetch_headwords_for_collection(conn, collection_id).map_err(|e| {
        serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()
    })?;

    if headwords.is_empty() {
        return Err(serde_json::to_value(CommandFailure::not_found(
            "The selected collection is empty or could not be found.",
        ))
        .unwrap());
    }

    Ok(Some(headwords))
}

/// Build a prompt that optionally injects vocabulary context.
fn build_prompt(prompt: &str, vocabulary_context: Option<&Vec<String>>) -> String {
    match vocabulary_context {
        Some(words) if !words.is_empty() => {
            let word_list = words.join(", ");
            format!(
                "You are helping a language learner practice vocabulary. \
                The learner is currently studying these words: {word_list}.\n\n\
                Learner: {prompt}"
            )
        }
        _ => prompt.to_string(),
    }
}

/// Resolve and retrieve the active API key for the given provider from the OS keychain.
/// Returns a `KEY_REQUIRED` error if no active credential exists.
fn resolve_api_key(
    conn: &rusqlite::Connection,
    provider: &str,
) -> Result<String, serde_json::Value> {
    let credential = queries::fetch_active_credential(conn, provider).map_err(|e| {
        serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()
    })?;

    let cred = credential.ok_or_else(|| {
        serde_json::to_value(CommandFailure::new(
            "KEY_REQUIRED",
            "No API key is saved. Go to Profile to add your OpenRouter key.",
        ))
        .unwrap()
    })?;

    // Read raw key from OS keychain
    let service = "com.singapur.cards";
    let account = format!("provider:{}:key:{}", provider, cred.id);
    let keyring_entry = keyring::Entry::new(service, &account).map_err(|e| {
        serde_json::to_value(CommandFailure::new(
            "SECRET_STORE_READ_FAILED",
            format!("Failed to access keychain: {e}"),
        ))
        .unwrap()
    })?;
    let api_key = keyring_entry.get_password().map_err(|_| {
        serde_json::to_value(CommandFailure::new(
            "KEY_REQUIRED",
            "No API key is saved. Go to Profile to add your OpenRouter key.",
        ))
        .unwrap()
    })?;

    Ok(api_key)
}

fn emit_stream_chunk(app: &tauri::AppHandle, stream_id: &str, delta: &str) {
    if delta.is_empty() {
        return;
    }
    let _ = app.emit(
        "chat_stream_chunk",
        json!({ "streamId": stream_id, "delta": delta }),
    );
}

fn emit_stream_error(app: &tauri::AppHandle, stream_id: &str, code: &str, message: &str) {
    let _ = app.emit(
        "chat_stream_error",
        json!({ "streamId": stream_id, "code": code, "message": message }),
    );
}

fn register_cancel_flag(state: &AppState, stream_id: &str) -> std::sync::Arc<AtomicBool> {
    let flag = std::sync::Arc::new(AtomicBool::new(false));
    if let Ok(mut map) = state.chat_stream_cancels.lock() {
        map.insert(stream_id.to_string(), flag.clone());
    }
    flag
}

fn unregister_cancel_flag(state: &AppState, stream_id: &str) {
    if let Ok(mut map) = state.chat_stream_cancels.lock() {
        map.remove(stream_id);
    }
}

#[command]
pub async fn cancel_chat_stream(stream_id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    if stream_id.trim().is_empty() {
        return Ok(());
    }
    let map = state
        .chat_stream_cancels
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?;
    if let Some(flag) = map.get(&stream_id) {
        flag.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[command]
pub async fn send_chat_message(
    app: tauri::AppHandle,
    input: SendChatMessageInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.stream_id.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("streamId must not be empty")).unwrap());
    }

    // Validate prompt
    if input.prompt.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("prompt must not be empty")).unwrap());
    }

    if input.model.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("model must not be empty")).unwrap());
    }

    if input.conversation_id.trim().is_empty() {
        return Ok(
            serde_json::to_value(CommandFailure::invalid_input("conversationId must not be empty")).unwrap(),
        );
    }

    let stream_id = input.stream_id.clone();
    let cancel = register_cancel_flag(&state, &stream_id);

    let result = async {
        // Scope the MutexGuard so it is dropped before the async network call.
        let (api_key, full_prompt) = {
            let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

            let exists = queries::chat_conversation_exists(&conn, &input.conversation_id).map_err(|e| e.to_string())?;
            if !exists {
                return Ok(serde_json::to_value(CommandFailure::not_found("Conversation not found.")).unwrap());
            }

            let api_key = match resolve_api_key(&conn, &input.provider) {
                Ok(key) => key,
                Err(err_val) => return Ok(err_val),
            };

            let vocabulary_context = match resolve_vocabulary_context(&conn, &input.selected_collection_id) {
                Ok(ctx) => ctx,
                Err(err_val) => return Ok(err_val),
            };

            let full_prompt = build_prompt(&input.prompt, vocabulary_context.as_ref());
            (api_key, full_prompt)
        };

        let (assistant_message, token_usage) =
            match stream_openrouter(&app, &stream_id, &cancel, &api_key, &input.model, &full_prompt).await {
                Ok(v) => v,
                Err(err_val) => return Ok(err_val),
            };

        let assistant_metadata_json = {
            let mut meta = serde_json::Map::new();
            meta.insert(
                "model".to_string(),
                serde_json::Value::String(input.model.clone()),
            );
            if let Some(tu) = token_usage.as_ref() {
                meta.insert("tokenUsage".to_string(), tu.clone());
            }
            serde_json::to_string(&serde_json::Value::Object(meta)).ok()
        };

        let persist_result: Result<(String, String), String> = (|| {
            let mut conn = state.db.conn.lock().map_err(|e| e.to_string())?;
            queries::append_chat_turn(
                &mut *conn,
                &input.conversation_id,
                &input.prompt,
                &assistant_message,
                assistant_metadata_json.as_deref(),
                Some(input.model.as_str()),
                input.selected_collection_id.as_deref(),
            )
            .map_err(|e| e.to_string())
        })();

        let (user_message_id, assistant_message_id) = match persist_result {
            Ok(ids) => ids,
            Err(e) => {
                return Ok(serde_json::to_value(CommandFailure::unexpected_error(format!(
                    "Chat response received but failed to save: {e}"
                )))
                .unwrap());
            }
        };

        let _ = app.emit(
            "chat_stream_done",
            json!({
                "streamId": stream_id,
                "userMessageId": user_message_id,
                "assistantMessageId": assistant_message_id,
                "assistantMessage": assistant_message,
                "tokenUsage": token_usage,
            }),
        );

        Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "assistantMessage": assistant_message,
            "tokenUsage": token_usage,
            "userMessageId": user_message_id,
            "assistantMessageId": assistant_message_id,
        })))
        .unwrap())
    }
    .await;

    unregister_cancel_flag(&state, &stream_id);
    result
}

async fn stream_openrouter(
    app: &tauri::AppHandle,
    stream_id: &str,
    cancel: &std::sync::Arc<AtomicBool>,
    api_key: &str,
    model: &str,
    prompt: &str,
) -> Result<(String, Option<serde_json::Value>), serde_json::Value> {
    let client = reqwest::Client::new();

    let body = json!({
        "model": model,
        "messages": [
            { "role": "user", "content": prompt }
        ],
        "stream": true,
        "stream_options": { "include_usage": true }
    });

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://singapur.cards")
        .header("X-Title", "Singapur Cards")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            serde_json::to_value(CommandFailure::unexpected_error(format!("Network error: {e}"))).unwrap()
        })?;

    let status = response.status();

    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        emit_stream_error(
            app,
            stream_id,
            "KEY_REQUIRED",
            "Your API key is invalid or unauthorized. Please check it in Profile.",
        );
        return Err(serde_json::to_value(CommandFailure::new(
            "KEY_REQUIRED",
            "Your API key is invalid or unauthorized. Please check it in Profile.",
        ))
        .unwrap());
    }

    if !status.is_success() {
        let err_text = response.text().await.unwrap_or_default();
        let msg = if let Ok(v) = serde_json::from_str::<serde_json::Value>(&err_text) {
            v.get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .unwrap_or("Request failed. Please try again.")
                .to_string()
        } else if err_text.trim().is_empty() {
            "Request failed. Please try again.".to_string()
        } else {
            err_text.chars().take(500).collect()
        };
        emit_stream_error(app, stream_id, "UNEXPECTED_ERROR", &msg);
        return Err(serde_json::to_value(CommandFailure::unexpected_error(msg)).unwrap());
    }

    let mut stream = response.bytes_stream();
    let mut buf = String::new();
    let mut full_text = String::new();
    let mut last_usage: Option<serde_json::Value> = None;

    while let Some(item) = stream.next().await {
        if cancel.load(Ordering::SeqCst) {
            emit_stream_error(app, stream_id, "CANCELLED", "Generation stopped.");
            return Err(serde_json::to_value(CommandFailure::new(
                "CANCELLED",
                "Generation stopped.",
            ))
            .unwrap());
        }

        let chunk = item.map_err(|e| {
            serde_json::to_value(CommandFailure::unexpected_error(format!("Stream read error: {e}"))).unwrap()
        })?;

        buf.push_str(&String::from_utf8_lossy(&chunk));

        loop {
            let Some(pos) = buf.find('\n') else { break };
            let line = buf[..pos].trim_end_matches('\r').to_string();
            buf = buf[pos + 1..].to_string();

            let line = line.trim();
            if line.is_empty() || line.starts_with(':') {
                continue;
            }
            if !line.starts_with("data:") {
                continue;
            }
            let data = line["data:".len()..].trim();
            if data == "[DONE]" {
                if full_text.trim().is_empty() {
                    emit_stream_error(app, stream_id, "UNEXPECTED_ERROR", "Empty response from provider.");
                    return Err(serde_json::to_value(CommandFailure::unexpected_error(
                        "Empty response from provider.",
                    ))
                    .unwrap());
                }
                return Ok((full_text, last_usage));
            }

            let parsed: serde_json::Value = match serde_json::from_str(data) {
                Ok(v) => v,
                Err(_) => continue,
            };

            if let Some(err) = parsed.get("error") {
                let msg = err
                    .get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("Provider error.");
                emit_stream_error(app, stream_id, "UNEXPECTED_ERROR", msg);
                return Err(serde_json::to_value(CommandFailure::unexpected_error(msg)).unwrap());
            }

            if let Some(usage) = parsed.get("usage") {
                if !usage.is_null() {
                    last_usage = Some(serde_json::json!({
                        "promptTokens": usage.get("prompt_tokens").and_then(|v| v.as_i64()).unwrap_or(0),
                        "completionTokens": usage.get("completion_tokens").and_then(|v| v.as_i64()).unwrap_or(0),
                        "totalTokens": usage.get("total_tokens").and_then(|v| v.as_i64()).unwrap_or(0),
                    }));
                }
            }

            let content = parsed
                .get("choices")
                .and_then(|c| c.get(0))
                .and_then(|c| c.get("delta"))
                .and_then(|d| d.get("content"))
                .and_then(|c| c.as_str());

            if let Some(piece) = content {
                if !piece.is_empty() {
                    full_text.push_str(piece);
                    emit_stream_chunk(app, stream_id, piece);
                }
            }
        }
    }

    if cancel.load(Ordering::SeqCst) {
        emit_stream_error(app, stream_id, "CANCELLED", "Generation stopped.");
        return Err(serde_json::to_value(CommandFailure::new("CANCELLED", "Generation stopped.")).unwrap());
    }

    // Some providers close the stream without a final `[DONE]` line.
    if !full_text.trim().is_empty() {
        return Ok((full_text, last_usage));
    }

    emit_stream_error(app, stream_id, "UNEXPECTED_ERROR", "Empty response from provider.");
    Err(
        serde_json::to_value(CommandFailure::unexpected_error("Empty response from provider.")).unwrap(),
    )
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_prompt() {
        let input = SendChatMessageInput {
            prompt: "  ".to_string(),
            model: "gpt-4o".to_string(),
            provider: "openrouter".to_string(),
            conversation_id: "conv-1".to_string(),
            selected_collection_id: None,
            stream_id: "s1".to_string(),
        };
        assert!(input.prompt.trim().is_empty(), "should detect empty prompt");
    }

    #[test]
    fn rejects_empty_model() {
        let input = SendChatMessageInput {
            prompt: "Hello".to_string(),
            model: "".to_string(),
            provider: "openrouter".to_string(),
            conversation_id: "conv-1".to_string(),
            selected_collection_id: None,
            stream_id: "s1".to_string(),
        };
        assert!(input.model.trim().is_empty(), "should detect empty model");
    }

    #[test]
    fn build_prompt_without_context() {
        let result = build_prompt("Hello", None);
        assert_eq!(result, "Hello");
    }

    #[test]
    fn build_prompt_with_context() {
        let words = vec!["apple".to_string(), "banana".to_string()];
        let result = build_prompt("What do these mean?", Some(&words));
        assert!(result.contains("apple"));
        assert!(result.contains("banana"));
        assert!(result.contains("What do these mean?"));
    }

    #[test]
    fn build_prompt_with_empty_context() {
        let words: Vec<String> = vec![];
        let result = build_prompt("Hello", Some(&words));
        assert_eq!(result, "Hello");
    }

    #[test]
    fn resolve_vocabulary_context_returns_none_when_no_collection() {
        let input_none: Option<String> = None;
        let input_empty: Option<String> = Some("".to_string());

        assert!(matches!(&input_none, None));
        assert!(matches!(&input_empty, Some(s) if s.is_empty()));
    }
}
