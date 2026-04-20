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

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS chat_conversations (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            model TEXT,
            collection_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY NOT NULL,
            conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            body TEXT NOT NULL,
            metadata_json TEXT,
            created_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
            ON chat_messages(conversation_id, created_at);",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS custom_chat_models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            provider TEXT NOT NULL,
            created_at TEXT NOT NULL
        );",
    )?;

    // -----------------------------------------------------------------------
    // Sync metadata tables
    // -----------------------------------------------------------------------

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS sync_devices (
            id TEXT PRIMARY KEY NOT NULL,
            display_name TEXT NOT NULL,
            host TEXT,
            port INTEGER,
            is_local INTEGER NOT NULL DEFAULT 0 CHECK(is_local IN (0,1)),
            credential TEXT,
            last_sync_request_id TEXT,
            paired_at TEXT,
            last_sync_at TEXT,
            created_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS sync_changes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            table_name TEXT NOT NULL,
            row_id TEXT NOT NULL,
            op_type TEXT NOT NULL CHECK(op_type IN ('insert','update')),
            logical_clock INTEGER NOT NULL,
            payload_json TEXT NOT NULL,
            request_id TEXT,
            applied_at TEXT,
            created_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_sync_changes_device_clock
            ON sync_changes(device_id, logical_clock);",
    )?;
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_sync_changes_table_row
            ON sync_changes(table_name, row_id);",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS sync_tombstones (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            table_name TEXT NOT NULL,
            row_id TEXT NOT NULL,
            logical_clock INTEGER NOT NULL,
            request_id TEXT,
            deleted_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_sync_tombstones_device_clock
            ON sync_tombstones(device_id, logical_clock);",
    )?;
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_sync_tombstones_table_row
            ON sync_tombstones(table_name, row_id);",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS sync_cursors (
            peer_device_id TEXT PRIMARY KEY NOT NULL,
            last_remote_logical_clock INTEGER NOT NULL DEFAULT 0,
            last_acknowledged_local_logical_clock INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        );",
    )?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS sync_state (
            id TEXT PRIMARY KEY NOT NULL DEFAULT 'local',
            first_successful_sync_at TEXT
        );",
    )?;

    conn.execute(
        "INSERT OR IGNORE INTO sync_state (id, first_successful_sync_at) VALUES ('local', NULL)",
        [],
    )?;

    // Desktop-side sync triggers (same tables as mobile, mirrors mobile trigger logic)
    conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS sync_trig_insert_cards
         AFTER INSERT ON cards
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'cards', NEW.id, 'insert',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'language',NEW.language,'headword',NEW.headword,'answer_text',NEW.answer_text,'example_text',NEW.example_text,'notes',NEW.notes,'audio_reference',NEW.audio_reference,'source_entry_ids',NEW.source_entry_ids,'learning_status',NEW.learning_status,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'last_reviewed_at',NEW.last_reviewed_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_update_cards
         AFTER UPDATE ON cards
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'cards', NEW.id, 'update',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'language',NEW.language,'headword',NEW.headword,'answer_text',NEW.answer_text,'example_text',NEW.example_text,'notes',NEW.notes,'audio_reference',NEW.audio_reference,'source_entry_ids',NEW.source_entry_ids,'learning_status',NEW.learning_status,'created_at',NEW.created_at,'updated_at',NEW.updated_at,'last_reviewed_at',NEW.last_reviewed_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_delete_cards
         AFTER DELETE ON cards
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_tombstones (id, device_id, table_name, row_id, logical_clock, deleted_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'cards', OLD.id,
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             datetime('now')
           );
         END;",
    )?;

    conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS sync_trig_insert_collections
         AFTER INSERT ON collections
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'collections', NEW.id, 'insert',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'name',NEW.name,'description',NEW.description,'created_at',NEW.created_at,'updated_at',NEW.updated_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_update_collections
         AFTER UPDATE ON collections
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'collections', NEW.id, 'update',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'name',NEW.name,'description',NEW.description,'created_at',NEW.created_at,'updated_at',NEW.updated_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_delete_collections
         AFTER DELETE ON collections
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_tombstones (id, device_id, table_name, row_id, logical_clock, deleted_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'collections', OLD.id,
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             datetime('now')
           );
         END;",
    )?;

    conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS sync_trig_insert_collection_memberships
         AFTER INSERT ON collection_memberships
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'collection_memberships', NEW.collection_id || ':' || NEW.card_id, 'insert',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('collection_id',NEW.collection_id,'card_id',NEW.card_id,'created_at',NEW.created_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_delete_collection_memberships
         AFTER DELETE ON collection_memberships
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_tombstones (id, device_id, table_name, row_id, logical_clock, deleted_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'collection_memberships', OLD.collection_id || ':' || OLD.card_id,
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             datetime('now')
           );
         END;",
    )?;

    conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS sync_trig_insert_review_events
         AFTER INSERT ON review_events
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'review_events', NEW.id, 'insert',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'card_id',NEW.card_id,'result',NEW.result,'reviewed_at',NEW.reviewed_at),
             datetime('now')
           );
         END;",
    )?;

    conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS sync_trig_insert_chat_conversations
         AFTER INSERT ON chat_conversations
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'chat_conversations', NEW.id, 'insert',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'title',NEW.title,'model',NEW.model,'collection_id',NEW.collection_id,'created_at',NEW.created_at,'updated_at',NEW.updated_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_update_chat_conversations
         AFTER UPDATE ON chat_conversations
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'chat_conversations', NEW.id, 'update',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'title',NEW.title,'model',NEW.model,'collection_id',NEW.collection_id,'created_at',NEW.created_at,'updated_at',NEW.updated_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_delete_chat_conversations
         AFTER DELETE ON chat_conversations
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_tombstones (id, device_id, table_name, row_id, logical_clock, deleted_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'chat_conversations', OLD.id,
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             datetime('now')
           );
         END;",
    )?;

    conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS sync_trig_insert_chat_messages
         AFTER INSERT ON chat_messages
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'chat_messages', NEW.id, 'insert',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'conversation_id',NEW.conversation_id,'role',NEW.role,'body',NEW.body,'metadata_json',NEW.metadata_json,'created_at',NEW.created_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_delete_chat_messages
         AFTER DELETE ON chat_messages
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_tombstones (id, device_id, table_name, row_id, logical_clock, deleted_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'chat_messages', OLD.id,
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             datetime('now')
           );
         END;",
    )?;

    conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS sync_trig_insert_custom_chat_models
         AFTER INSERT ON custom_chat_models
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'custom_chat_models', NEW.id, 'insert',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'name',NEW.name,'title',NEW.title,'provider',NEW.provider,'created_at',NEW.created_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_update_custom_chat_models
         AFTER UPDATE ON custom_chat_models
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'custom_chat_models', NEW.id, 'update',
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             json_object('id',NEW.id,'name',NEW.name,'title',NEW.title,'provider',NEW.provider,'created_at',NEW.created_at),
             datetime('now')
           );
         END;

         CREATE TRIGGER IF NOT EXISTS sync_trig_delete_custom_chat_models
         AFTER DELETE ON custom_chat_models
         WHEN (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1) IS NOT NULL
         BEGIN
           INSERT INTO sync_tombstones (id, device_id, table_name, row_id, logical_clock, deleted_at)
           VALUES (
             lower(hex(randomblob(16))),
             (SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1),
             'custom_chat_models', OLD.id,
             COALESCE((SELECT MAX(lc) FROM (SELECT MAX(logical_clock) AS lc FROM sync_changes UNION ALL SELECT MAX(logical_clock) AS lc FROM sync_tombstones)), 0) + 1,
             datetime('now')
           );
         END;",
    )?;

    Ok(())
}
