use rusqlite::Connection;
use std::sync::Mutex;

use crate::db::schema::run_migrations;

pub struct DbPool {
    pub conn: Mutex<Connection>,
}

pub struct AppState {
    pub db: DbPool,
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
        })
    }
}

pub type AppStateRef<'a> = tauri::State<'a, AppState>;
