mod commands;
mod splash_screen;
pub mod db;
#[cfg(test)]
pub mod dev;
pub mod dsl;
pub mod models;
mod state;
pub mod sync;

use commands::*;
use rusqlite::OptionalExtension;
use state::{AppState, SyncHandle};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data directory");
            let app_state = AppState::new(app_data_dir)
                .expect("Failed to initialize app state");

            // Share the DB connection with the sync HTTP server
            let shared_conn = app_state.db.conn.clone();

            // Ensure a local device identity exists in sync_devices
            let local_device_id = {
                let conn = shared_conn.lock().expect("DB lock");
                let id = ensure_local_device_identity(&conn);
                sync::backfill::run_desktop_sync_backfill(&conn, &id)
                    .expect("Desktop sync backfill failed");
                id
            };

            // Start the sync HTTP server in the background
            let sync_handle = sync::server::start_sync_server(
                shared_conn,
                local_device_id,
                "Desktop".to_string(),
            )
            .expect("Failed to start sync server");

            app.manage(app_state);
            app.manage(SyncHandle(Some(sync_handle)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            splash_screen::splash_screen_finish,
            dictionary::import_dictionary,
            dictionary::list_dictionaries,
            dictionary::remove_dictionary,
            dictionary::search_headwords,
            dictionary::get_headword_detail,
            cards::create_card_from_headword_detail,
            cards::update_card,
            cards::get_card,
            cards::list_cards,
            cards::delete_card,
            collections::create_collection,
            collections::list_collections,
            collections::rename_collection,
            collections::delete_collection,
            review::start_review_session,
            review::record_review_result,
            languages::list_languages,
            languages::create_language,
            languages::update_language,
            languages::delete_language,
            languages::list_headwords_for_language,
            chat::send_chat_message,
            chat::cancel_chat_stream,
            chat_history::create_chat_conversation,
            chat_history::list_chat_conversations,
            chat_history::get_chat_messages,
            chat_history::delete_chat_conversation,
            api_key::save_api_credential,
            api_key::get_api_credential,
            api_key::delete_api_credential,
            custom_models::list_custom_models,
            custom_models::add_custom_model,
            custom_models::delete_custom_model,
            sync::sync_start_pairing,
            sync::sync_get_paired_devices,
            sync::sync_forget_device,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Ensures a local device identity row exists in `sync_devices`.
/// Returns the device ID (existing or newly created).
fn ensure_local_device_identity(conn: &rusqlite::Connection) -> String {
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .unwrap_or(None);

    if let Some(id) = existing {
        return id;
    }

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO sync_devices (id, display_name, is_local, created_at) VALUES (?1, 'Desktop', 1, datetime('now'))",
        rusqlite::params![id],
    )
    .expect("Failed to insert local device identity");
    id
}
