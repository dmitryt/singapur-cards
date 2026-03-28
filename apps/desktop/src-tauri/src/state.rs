use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

use crate::db::schema::run_migrations;

pub struct DbPool {
    pub conn: Mutex<Connection>,
}

/// Per in-flight chat stream; `true` requests cooperative cancellation (stop reading SSE, do not persist).
pub type ChatStreamCancelMap = Mutex<HashMap<String, Arc<AtomicBool>>>;

pub struct AppState {
    pub db: DbPool,
    pub chat_stream_cancels: ChatStreamCancelMap,
}

impl AppState {
    pub fn new(app_data_dir: std::path::PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data dir: {e}"))?;

        let db_path = app_data_dir.join("singapur_cards.db");
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {e}"))?;

        run_migrations(&conn).map_err(|e| format!("Migration failed: {e}"))?;

        Ok(AppState {
            db: DbPool {
                conn: Mutex::new(conn),
            },
            chat_stream_cancels: Mutex::new(HashMap::new()),
        })
    }
}

pub type AppStateRef<'a> = tauri::State<'a, AppState>;
