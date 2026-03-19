# Data Model: Vocabulary Learning Desktop App

**Branch**: `001-vocab-learning-app` | **Date**: 2026-03-19

---

## Entities

### Dictionary

A named imported dataset in DSL format. Metadata only — entries live in the `entries` table.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PK, autoincrement | |
| `name` | TEXT | NOT NULL | Extracted from DSL `#NAME` header |
| `source_filename` | TEXT | NOT NULL | Original filename, for display |
| `import_date` | INTEGER | NOT NULL | Unix timestamp (seconds) |
| `entry_count` | INTEGER | NOT NULL, DEFAULT 0 | Updated after import completes |
| `language_from` | TEXT | | DSL `#INDEX_LANGUAGE` header value |
| `language_to` | TEXT | | DSL `#CONTENTS_LANGUAGE` header value |

**Validation rules**:
- `name` must be non-empty after trimming.
- `entry_count` is set atomically at end of import transaction — never partially updated.
- Deleting a dictionary cascades to `entries` but NOT to `cards` (cards are independent copies).

---

### Entry

A single record from an imported DSL dictionary. Owned by a dictionary — deleted with it.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER | PK, autoincrement | |
| `dict_id` | INTEGER | NOT NULL, FK → dictionaries(id) CASCADE DELETE | |
| `headword` | TEXT | NOT NULL | Primary lookup key |
| `transcription` | TEXT | | May be empty |
| `body_html` | TEXT | NOT NULL | Cleaned/rendered body for display |
| `body_plain` | TEXT | NOT NULL | Strip-tagged text for FTS5 indexing |

**FTS5 virtual tables** (SQLite):
```sql
-- Headword-only FTS for autocomplete (fastest path)
CREATE VIRTUAL TABLE headwords_fts USING fts5(
    headword,
    content='entries',
    content_rowid='id',
    tokenize='unicode61 remove_diacritics 2',
    prefix='1 2 3 4 5'
);

-- Full-body FTS for definition/example search
CREATE VIRTUAL TABLE entries_fts USING fts5(
    headword,
    body_plain,
    content='entries',
    content_rowid='id',
    tokenize='unicode61 remove_diacritics 2'
);
```

Both are kept in sync via INSERT/UPDATE/DELETE triggers on `entries`.

---

### Card

A personal learning unit created by the user from a dictionary entry. **Independent from the source dictionary after creation** — deleting the source dictionary does not affect cards.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | TEXT | PK | UUID v4, generated in Rust |
| `word` | TEXT | NOT NULL | Copied from entry headword at creation time |
| `transcription` | TEXT | | Copied from entry; may be empty |
| `definitions` | TEXT | NOT NULL | JSON array of strings |
| `examples` | TEXT | NOT NULL | JSON array of strings; may be empty array |
| `notes` | TEXT | NOT NULL, DEFAULT '' | User-authored notes |
| `created_at` | INTEGER | NOT NULL | Unix timestamp |
| `learned` | INTEGER | NOT NULL, DEFAULT 0 | 0 = not learned, 1 = learned |
| `source_dict_name` | TEXT | | Name of source dictionary at creation time; informational only |
| `source_headword` | TEXT | | Original headword from source entry; informational only |

**Validation rules**:
- `word` must be non-empty.
- `definitions` must be a valid JSON array with at least one non-empty string.
- `examples` may be an empty JSON array `[]`.
- `learned` toggled explicitly; persists across restarts (FR-016).
- Duplicate detection: query by `(word, source_dict_name)` before save; surface to user if match found (US3-AC3).

---

### Collection

A user-defined named group of cards. Deleting a collection does NOT delete its cards.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | TEXT | PK | UUID v4 |
| `name` | TEXT | NOT NULL, UNIQUE | Non-empty after trim |
| `created_at` | INTEGER | NOT NULL | Unix timestamp |

**Validation rules**:
- `name` must be unique (case-insensitive comparison recommended).
- Rename must preserve `id` and all card assignments.

---

### CardCollection (junction)

Many-to-many relationship between cards and collections. A card may belong to zero or more collections.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `card_id` | TEXT | FK → cards(id) CASCADE DELETE | |
| `collection_id` | TEXT | FK → collections(id) CASCADE DELETE | |
| PRIMARY KEY | | `(card_id, collection_id)` | |

**Cascade rules**:
- Deleting a card removes its junction rows.
- Deleting a collection removes its junction rows; cards survive unchanged.

---

### ReviewSession

Records a completed or in-progress review session for auditing and summary display.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | TEXT | PK | UUID v4 |
| `collection_id` | TEXT | FK → collections(id) SET NULL | NULL = full library session |
| `started_at` | INTEGER | NOT NULL | Unix timestamp |
| `ended_at` | INTEGER | | NULL until session ends |
| `total_cards` | INTEGER | NOT NULL | Count at session start |
| `learned_count` | INTEGER | NOT NULL, DEFAULT 0 | Updated during session |
| `not_learned_count` | INTEGER | NOT NULL, DEFAULT 0 | Updated during session |

---

## State Transitions

### Card `learned` field

```
created → learned=0 (not learned)
  ↓ user marks "learned" during review
learned=1
  ↓ user marks "not learned" during review
learned=0
```

Toggle is explicit and persists immediately to SQLite after each mark action.

### Import lifecycle

```
idle
  → [user selects file] → parsing (progress events: status="parsing")
  → [entries streamed] → indexing (progress events: status="indexing")
  → [FTS rebuild] → done (progress event: status="done")
  → [any error] → error (progress event: status="error", existing data unaffected)
```

### Review session lifecycle

```
idle
  → [startSession(collectionId?)] → session active, cards shuffled
  → [flip()] → card flipped
  → [markLearned() / markNotLearned()] → next card OR session ended
  → [endSession()] → summary shown, session record written to DB
  → idle
```

---

## Full SQLite Schema (DDL)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS dictionaries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    import_date     INTEGER NOT NULL,
    entry_count     INTEGER NOT NULL DEFAULT 0,
    language_from   TEXT,
    language_to     TEXT
);

CREATE TABLE IF NOT EXISTS entries (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    dict_id        INTEGER NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
    headword       TEXT NOT NULL,
    transcription  TEXT NOT NULL DEFAULT '',
    body_html      TEXT NOT NULL,
    body_plain     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_dict ON entries(dict_id);

CREATE VIRTUAL TABLE IF NOT EXISTS headwords_fts USING fts5(
    headword,
    content='entries',
    content_rowid='id',
    tokenize='unicode61 remove_diacritics 2',
    prefix='1 2 3 4 5'
);

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
    headword,
    body_plain,
    content='entries',
    content_rowid='id',
    tokenize='unicode61 remove_diacritics 2'
);

-- FTS sync triggers
CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO headwords_fts(rowid, headword) VALUES (new.id, new.headword);
    INSERT INTO entries_fts(rowid, headword, body_plain) VALUES (new.id, new.headword, new.body_plain);
END;
CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
    INSERT INTO headwords_fts(headwords_fts, rowid, headword) VALUES ('delete', old.id, old.headword);
    INSERT INTO entries_fts(entries_fts, rowid, headword, body_plain) VALUES ('delete', old.id, old.headword, old.body_plain);
END;

CREATE TABLE IF NOT EXISTS cards (
    id               TEXT PRIMARY KEY,
    word             TEXT NOT NULL,
    transcription    TEXT NOT NULL DEFAULT '',
    definitions      TEXT NOT NULL,  -- JSON array
    examples         TEXT NOT NULL DEFAULT '[]',  -- JSON array
    notes            TEXT NOT NULL DEFAULT '',
    created_at       INTEGER NOT NULL,
    learned          INTEGER NOT NULL DEFAULT 0,
    source_dict_name TEXT,
    source_headword  TEXT
);

CREATE TABLE IF NOT EXISTS collections (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS card_collections (
    card_id       TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, collection_id)
);

CREATE TABLE IF NOT EXISTS review_sessions (
    id               TEXT PRIMARY KEY,
    collection_id    TEXT REFERENCES collections(id) ON DELETE SET NULL,
    started_at       INTEGER NOT NULL,
    ended_at         INTEGER,
    total_cards      INTEGER NOT NULL,
    learned_count    INTEGER NOT NULL DEFAULT 0,
    not_learned_count INTEGER NOT NULL DEFAULT 0
);
```
