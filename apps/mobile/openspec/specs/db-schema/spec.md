### Requirement: Canonical tables exist after first migration run
The app SHALL create all canonical tables (`languages`, `dictionaries`, `dictionary_entries`, `cards`, `collections`, `collection_memberships`, `review_events`, `ai_credentials`, `chat_conversations`, `chat_messages`, `custom_chat_models`) and their indexes via a single migration applied at startup.

#### Scenario: All canonical tables are present after first launch
- **WHEN** the app is launched on a fresh device
- **THEN** each canonical table exists in the SQLite database and can be queried without error

#### Scenario: Canonical indexes are present after first launch
- **WHEN** the app is launched on a fresh device
- **THEN** `idx_dictionary_entries_dictionary_id`, `idx_dictionary_entries_normalized_headword`, `ux_ai_credentials_provider_active`, and `idx_chat_messages_conversation_created` exist in the database

### Requirement: `languages` table is seeded with English on first run
The app SHALL insert the `en`/`English` row into `languages` as part of the schema migration, using `INSERT OR IGNORE` so re-runs are safe.

#### Scenario: English language row exists after migration
- **WHEN** the schema migration is applied for the first time
- **THEN** a row with `code = 'en'` and `title = 'English'` exists in the `languages` table

#### Scenario: Seed is idempotent
- **WHEN** the migration is applied on a database that already contains the `en` row
- **THEN** no duplicate row is inserted and no error is raised

### Requirement: Foreign key constraints are enforced at runtime
The app SHALL enable `PRAGMA foreign_keys=ON` on every database connection so that referential integrity is enforced.

#### Scenario: Inserting an orphaned row is rejected
- **WHEN** code attempts to insert a row that references a non-existent parent (e.g., a `card` with an unknown `dictionary_id`)
- **THEN** SQLite raises a foreign key constraint error

### Requirement: WAL journal mode is active
The app SHALL enable `PRAGMA journal_mode=WAL` on every database connection.

#### Scenario: Journal mode is WAL after open
- **WHEN** the database is opened
- **THEN** `PRAGMA journal_mode` returns `wal`
