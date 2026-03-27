mod commands;
pub mod db;
#[cfg(test)]
pub mod dev;
pub mod dsl;
pub mod models;
mod state;

use commands::*;
use state::AppState;
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
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
            api_key::save_api_credential,
            api_key::get_api_credential,
            api_key::delete_api_credential,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
