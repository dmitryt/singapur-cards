## Why

The mobile app's SQLite database currently has only a placeholder `app_meta` table, while the desktop app has a full schema (`cards`, `collections`, `dictionaries`, `languages`, `review_events`, etc.). Until the mobile schema mirrors the desktop schema, the mobile client cannot read or write any real application data.

## What Changes

- Add a new migration to `src/db/migrate.ts` that creates all canonical tables defined in `docs/data/sql-schemas.md`
- Tables to add: `languages`, `dictionaries`, `dictionary_entries`, `cards`, `collections`, `collection_memberships`, `review_events`, `ai_credentials`, `chat_conversations`, `chat_messages`, `custom_chat_models`
- Add all canonical indexes from the schema
- Add the `languages` seed row (`en`, `English`)
- Enable `PRAGMA foreign_keys=ON` and `PRAGMA journal_mode=WAL` at database open time

## Capabilities

### New Capabilities
- `db-schema`: Full canonical SQLite schema applied via a single migration, matching the desktop schema

### Modified Capabilities
- `sqlite-storage`: The migration runner now applies a schema migration; startup behavior and migration tracking requirements are unchanged, but a new concrete migration is added

## Impact

- `src/db/migrate.ts`: new migration entry appended to `MIGRATIONS`
- `src/db/index.ts`: PRAGMAs applied after database open
- No API or dependency changes required
