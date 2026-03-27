use rusqlite::{Connection, Result};

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS dictionaries (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL UNIQUE,
            language_from TEXT NOT NULL,
            language_to TEXT NOT NULL,
            source_filename TEXT NOT NULL,
            source_path TEXT,
            import_status TEXT NOT NULL DEFAULT 'queued'
                CHECK(import_status IN ('queued', 'importing', 'ready', 'failed')),
            entry_count INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS dictionary_entries (
            id TEXT PRIMARY KEY NOT NULL,
            dictionary_id TEXT NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
            headword TEXT NOT NULL,
            normalized_headword TEXT NOT NULL,
            transcription TEXT,
            definition_text TEXT NOT NULL,
            example_text TEXT,
            audio_reference TEXT,
            source_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_dictionary_entries_dictionary_id
            ON dictionary_entries(dictionary_id);",
    )?;

    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_dictionary_entries_normalized_headword
            ON dictionary_entries(normalized_headword);",
    )?;

    conn.execute_batch(
        "CREATE VIRTUAL TABLE IF NOT EXISTS dictionary_entries_fts
            USING fts5(
                normalized_headword,
                content=dictionary_entries,
                content_rowid=rowid
            );",
    )?;

    // FTS triggers for keeping the index in sync
    conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS dictionary_entries_fts_insert
            AFTER INSERT ON dictionary_entries BEGIN
                INSERT INTO dictionary_entries_fts(rowid, normalized_headword)
                VALUES (new.rowid, new.normalized_headword);
            END;

        CREATE TRIGGER IF NOT EXISTS dictionary_entries_fts_delete
            AFTER DELETE ON dictionary_entries BEGIN
                INSERT INTO dictionary_entries_fts(dictionary_entries_fts, rowid, normalized_headword)
                VALUES ('delete', old.rowid, old.normalized_headword);
            END;

        CREATE TRIGGER IF NOT EXISTS dictionary_entries_fts_update
            AFTER UPDATE ON dictionary_entries BEGIN
                INSERT INTO dictionary_entries_fts(dictionary_entries_fts, rowid, normalized_headword)
                VALUES ('delete', old.rowid, old.normalized_headword);
                INSERT INTO dictionary_entries_fts(rowid, normalized_headword)
                VALUES (new.rowid, new.normalized_headword);
            END;",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY NOT NULL,
            language TEXT NOT NULL,
            headword TEXT NOT NULL,
            answer_text TEXT NOT NULL,
            example_text TEXT,
            notes TEXT,
            audio_reference TEXT,
            source_entry_ids TEXT NOT NULL DEFAULT '[]',
            learning_status TEXT NOT NULL DEFAULT 'unreviewed'
                CHECK(learning_status IN ('unreviewed', 'learned', 'not_learned')),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_reviewed_at TEXT,
            UNIQUE(headword, language)
        );",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS collection_memberships (
            collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL,
            PRIMARY KEY (collection_id, card_id)
        );",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS review_events (
            id TEXT PRIMARY KEY NOT NULL,
            card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
            result TEXT NOT NULL CHECK(result IN ('learned', 'not_learned')),
            reviewed_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS languages (
            code TEXT PRIMARY KEY NOT NULL
                CHECK(LENGTH(code) = 2 AND code = LOWER(code)),
            title TEXT NOT NULL,
            created_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "INSERT OR IGNORE INTO languages (code, title, created_at)
         VALUES ('en', 'English', datetime('now'));",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS ai_credentials (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            label TEXT,
            is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_credentials_provider_active
         ON ai_credentials(provider)
         WHERE is_active = 1;",
    )?;

    Ok(())
}
