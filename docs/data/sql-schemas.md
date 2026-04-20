# SQL Schemas (Desktop SQLite)

Canonical source: `apps/desktop/src-tauri/src/db/schema.rs`.

## Runtime PRAGMAs

```sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
```

## Core Tables

### `dictionaries`

```sql
CREATE TABLE IF NOT EXISTS dictionaries (
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
);
```

### `dictionary_entries`

```sql
CREATE TABLE IF NOT EXISTS dictionary_entries (
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
);
```

### `cards`

```sql
CREATE TABLE IF NOT EXISTS cards (
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
);
```

### `collections`

```sql
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `collection_memberships`

```sql
CREATE TABLE IF NOT EXISTS collection_memberships (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (collection_id, card_id)
);
```

### `review_events`

```sql
CREATE TABLE IF NOT EXISTS review_events (
  id TEXT PRIMARY KEY NOT NULL,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK(result IN ('learned', 'not_learned')),
  reviewed_at TEXT NOT NULL
);
```

### `languages`

```sql
CREATE TABLE IF NOT EXISTS languages (
  code TEXT PRIMARY KEY NOT NULL
    CHECK(LENGTH(code) = 2 AND code = LOWER(code)),
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

Seed:

```sql
INSERT OR IGNORE INTO languages (code, title, created_at)
VALUES ('en', 'English', datetime('now'));
```

### `ai_credentials`

```sql
CREATE TABLE IF NOT EXISTS ai_credentials (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  label TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `chat_conversations`

```sql
CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  model TEXT,
  collection_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `chat_messages`

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  body TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
```

### `custom_chat_models`

```sql
CREATE TABLE IF NOT EXISTS custom_chat_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## Sync Metadata Tables

Sync v1 introduces metadata tables used for trusted-device state and incremental replication.
Canonical desktop source: `apps/desktop/src-tauri/src/db/schema.rs`.
Mobile OpenSpec also defines a conceptual `sync_state` metadata table; desktop currently tracks equivalent runtime state through existing sync tables.

### `sync_devices`

```sql
CREATE TABLE sync_devices (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  host TEXT,
  port INTEGER,
  is_local INTEGER NOT NULL,
  credential TEXT,
  last_sync_request_id TEXT,
  paired_at TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL
);
```

### `sync_changes`

```sql
CREATE TABLE sync_changes (
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
);
```

### `sync_cursors`

```sql
CREATE TABLE sync_cursors (
  peer_device_id TEXT PRIMARY KEY NOT NULL,
  last_remote_logical_clock INTEGER NOT NULL DEFAULT 0,
  last_acknowledged_local_logical_clock INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
```

### `sync_tombstones`

```sql
CREATE TABLE sync_tombstones (
  id TEXT PRIMARY KEY NOT NULL,
  device_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  logical_clock INTEGER NOT NULL,
  request_id TEXT,
  deleted_at TEXT NOT NULL
);
```

Notes:
- Local creates/updates append records to `sync_changes`.
- Local deletes append records to `sync_tombstones`.
- Per-peer replication progress is tracked in `sync_cursors`.
- `sync_changes` and `sync_tombstones` each use indexes on `(device_id, logical_clock)` and `(table_name, row_id)` for ordered replication and lookups.

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_dictionary_id
  ON dictionary_entries(dictionary_id);

CREATE INDEX IF NOT EXISTS idx_dictionary_entries_normalized_headword
  ON dictionary_entries(normalized_headword);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_credentials_provider_active
  ON ai_credentials(provider)
  WHERE is_active = 1;

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
  ON chat_messages(conversation_id, created_at);
```

## Full-Text Search (FTS5)

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS dictionary_entries_fts
  USING fts5(
    normalized_headword,
    content=dictionary_entries,
    content_rowid=rowid
  );
```

## FTS Sync Triggers

```sql
CREATE TRIGGER IF NOT EXISTS dictionary_entries_fts_insert
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
  END;
```
