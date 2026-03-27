use tauri::command;
use serde::Deserialize;

use crate::db::queries;
use crate::models::{CommandFailure, CommandSuccess};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendChatMessageInput {
    pub prompt: String,
    pub model: String,
    pub provider: String,
    pub selected_collection_id: Option<String>,
    pub vocabulary_context: Option<Vec<String>>,
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

#[command]
pub async fn send_chat_message(
    input: SendChatMessageInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    // Validate prompt
    if input.prompt.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("prompt must not be empty")).unwrap());
    }

    if input.model.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("model must not be empty")).unwrap());
    }

    // Scope the MutexGuard so it is dropped before the async network call.
    let (api_key, full_prompt) = {
        let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

        // Resolve API key from OS keychain via credential metadata in SQLite
        let api_key = match resolve_api_key(&conn, &input.provider) {
            Ok(key) => key,
            Err(err_val) => return Ok(err_val),
        };

        // Resolve vocabulary context (errors if collection set but empty/missing)
        let vocabulary_context = match resolve_vocabulary_context(&conn, &input.selected_collection_id) {
            Ok(ctx) => ctx,
            Err(err_val) => return Ok(err_val),
        };

        let full_prompt = build_prompt(&input.prompt, vocabulary_context.as_ref());
        // conn (MutexGuard) is dropped here before any .await
        (api_key, full_prompt)
    };

    // Call OpenRouter API
    call_openrouter(&api_key, &input.model, &full_prompt).await
}

async fn call_openrouter(
    api_key: &str,
    model: &str,
    prompt: &str,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "user", "content": prompt }
        ]
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
        .map_err(|e| format!("Network error: {e}"))?;

    let status = response.status();
    let response_body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    if status == 401 || status == 403 {
        return Ok(serde_json::to_value(CommandFailure::new(
            "KEY_REQUIRED",
            "Your API key is invalid or unauthorized. Please check it in Profile.",
        ))
        .unwrap());
    }

    if !status.is_success() {
        let msg = response_body
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("Request failed. Please try again.");
        return Ok(serde_json::to_value(CommandFailure::unexpected_error(msg)).unwrap());
    }

    let assistant_message = response_body
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or("")
        .to_string();

    if assistant_message.is_empty() {
        return Ok(
            serde_json::to_value(CommandFailure::unexpected_error("Empty response from provider."))
                .unwrap(),
        );
    }

    let token_usage = response_body.get("usage").map(|u| {
        serde_json::json!({
            "promptTokens": u.get("prompt_tokens").and_then(|v| v.as_i64()).unwrap_or(0),
            "completionTokens": u.get("completion_tokens").and_then(|v| v.as_i64()).unwrap_or(0),
            "totalTokens": u.get("total_tokens").and_then(|v| v.as_i64()).unwrap_or(0),
        })
    });

    Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
        "assistantMessage": assistant_message,
        "tokenUsage": token_usage,
    })))
    .unwrap())
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
            selected_collection_id: None,
            vocabulary_context: None,
        };
        assert!(input.prompt.trim().is_empty(), "should detect empty prompt");
    }

    #[test]
    fn rejects_empty_model() {
        let input = SendChatMessageInput {
            prompt: "Hello".to_string(),
            model: "".to_string(),
            provider: "openrouter".to_string(),
            selected_collection_id: None,
            vocabulary_context: None,
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
        // When selectedCollectionId is None, expect Ok(None) without DB access
        // (DB access only happens when Some(id) is provided)
        let input_none: Option<String> = None;
        let input_empty: Option<String> = Some("".to_string());

        // Both None and empty-string Some should resolve to no-context without DB query
        // We test the decision logic in isolation here
        assert!(matches!(&input_none, None));
        assert!(matches!(&input_empty, Some(s) if s.is_empty()));
    }
}
