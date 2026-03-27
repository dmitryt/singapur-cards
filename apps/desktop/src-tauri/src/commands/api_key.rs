use tauri::command;
use uuid::Uuid;
use chrono::Utc;
use serde::Deserialize;

use crate::db::queries;
use crate::models::{CommandFailure, CommandSuccess};
use crate::state::AppState;

const KEYCHAIN_SERVICE: &str = "com.singapur.cards";

fn keychain_account(provider: &str, credential_id: &str) -> String {
    format!("provider:{}:key:{}", provider, credential_id)
}

fn mask_key(key: &str) -> String {
    if key.len() <= 8 {
        return "••••".to_string();
    }
    let visible = &key[..8];
    format!("{visible}••••")
}

// ── Input types ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveApiCredentialInput {
    pub provider: String,
    pub label: Option<String>,
    pub api_key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetApiCredentialInput {
    pub provider: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteApiCredentialInput {
    pub provider: String,
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[command]
pub async fn save_api_credential(
    input: SaveApiCredentialInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.provider.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("provider is required")).unwrap());
    }
    if input.api_key.trim().is_empty() {
        return Ok(serde_json::to_value(CommandFailure::invalid_input("apiKey is required")).unwrap());
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let new_id = Uuid::new_v4().to_string();

    // Remove existing active credential for this provider (if any)
    if let Ok(Some(existing)) = queries::fetch_active_credential(&conn, &input.provider) {
        // Delete from keychain
        let old_account = keychain_account(&input.provider, &existing.id);
        if let Ok(entry) = keyring::Entry::new(KEYCHAIN_SERVICE, &old_account) {
            let _ = entry.delete_credential();
        }
        // Deactivate in SQLite
        let _ = conn.execute(
            "UPDATE ai_credentials SET is_active = 0, updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, existing.id],
        );
    }

    // Write new key to keychain
    let account = keychain_account(&input.provider, &new_id);
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, &account).map_err(|e| {
        format!("Keychain unavailable: {e}")
    })?;
    entry.set_password(&input.api_key).map_err(|e| {
        format!("Failed to write to keychain: {e}")
    })?;

    if let Err(e) = entry.get_password() {
        let _ = entry.delete_credential();
        return Ok(
            serde_json::to_value(CommandFailure::secret_store_read_failed(format!(
                "The key could not be read back from the keychain after saving ({e}). Check macOS keychain access for this app, then try again."
            )))
            .unwrap(),
        );
    }

    // Insert new credential row in SQLite
    let result = conn.execute(
        "INSERT INTO ai_credentials (id, provider, label, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, 1, ?4, ?5)",
        rusqlite::params![new_id, input.provider, input.label, now, now],
    );

    if let Err(e) = result {
        // Rollback keychain write on DB failure
        let _ = entry.delete_credential();
        return Ok(
            serde_json::to_value(CommandFailure::secret_store_write_failed(e.to_string())).unwrap(),
        );
    }

    let masked = mask_key(&input.api_key);
    Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
        "credentialId": new_id,
        "provider": input.provider,
        "maskedKey": masked,
    })))
    .unwrap())
}

#[command]
pub async fn get_api_credential(
    input: GetApiCredentialInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    match queries::fetch_active_credential(&conn, &input.provider) {
        Ok(Some(cred)) => {
            let account = keychain_account(&input.provider, &cred.id);
            let secret = keyring::Entry::new(KEYCHAIN_SERVICE, &account)
                .ok()
                .and_then(|e| e.get_password().ok());

            let Some(key) = secret else {
                // Readable secret required for a usable credential. Do not mutate DB here — a status check
                // should not deactivate rows (surprising “key disappeared”). Saving again in Profile runs
                // save_api_credential, which replaces any active row for this provider.
                return Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
                    "exists": false,
                    "maskedKey": null,
                    "label": null,
                })))
                .unwrap());
            };

            let masked = mask_key(&key);

            Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
                "exists": true,
                "maskedKey": masked,
                "label": cred.label,
            })))
            .unwrap())
        }
        Ok(None) => Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
            "exists": false,
            "maskedKey": null,
            "label": null,
        })))
        .unwrap()),
        Err(e) => Ok(
            serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap(),
        ),
    }
}

#[command]
pub async fn delete_api_credential(
    input: DeleteApiCredentialInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    match queries::fetch_active_credential(&conn, &input.provider) {
        Ok(Some(cred)) => {
            // Delete from keychain
            let account = keychain_account(&input.provider, &cred.id);
            if let Ok(entry) = keyring::Entry::new(KEYCHAIN_SERVICE, &account) {
                if let Err(e) = entry.delete_credential() {
                    return Ok(serde_json::to_value(CommandFailure::secret_store_delete_failed(
                        format!("Keychain delete failed: {e}"),
                    ))
                    .unwrap());
                }
            }
            // Deactivate in SQLite
            let _ = conn.execute(
                "UPDATE ai_credentials SET is_active = 0, updated_at = ?1 WHERE id = ?2",
                rusqlite::params![now, cred.id],
            );
            Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({ "ok": true }))).unwrap())
        }
        Ok(None) => {
            // No-op if no active credential
            Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({ "ok": true }))).unwrap())
        }
        Err(e) => Ok(
            serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap(),
        ),
    }
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mask_key_short() {
        assert_eq!(mask_key("abc"), "••••");
    }

    #[test]
    fn mask_key_normal() {
        let masked = mask_key("sk-abcdefgh12345678");
        assert!(masked.starts_with("sk-abcde"));
        assert!(masked.ends_with("••••"));
        // Raw key must not appear in masked output
        assert!(!masked.contains("12345678"));
    }

    #[test]
    fn keychain_account_format() {
        let account = keychain_account("openrouter", "my-cred-id");
        assert_eq!(account, "provider:openrouter:key:my-cred-id");
    }
}
