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
