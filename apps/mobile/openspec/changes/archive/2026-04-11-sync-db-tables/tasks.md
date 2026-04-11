## 1. Database Connection Setup

- [x] 1.1 Apply `PRAGMA journal_mode=WAL` and `PRAGMA foreign_keys=ON` in `src/db/index.ts` immediately after `openDatabaseSync`

## 2. Schema Migration

- [x] 2.1 Append migration `v2` to the `MIGRATIONS` array in `src/db/migrate.ts` with DDL for `languages`, `dictionaries`, `dictionary_entries`, `cards`, `collections`, `collection_memberships`, `review_events`, `ai_credentials`, `chat_conversations`, `chat_messages`, `custom_chat_models` (in foreign-key dependency order)
- [x] 2.2 Add canonical indexes (`idx_dictionary_entries_dictionary_id`, `idx_dictionary_entries_normalized_headword`, `ux_ai_credentials_provider_active`, `idx_chat_messages_conversation_created`) to migration `v2`
- [x] 2.3 Add `INSERT OR IGNORE INTO languages` seed for `en`/`English` to migration `v2`

## 3. Verification

- [x] 3.1 Run the app on a fresh simulator/device and confirm all canonical tables exist (query `sqlite_master`)
- [x] 3.2 Confirm `PRAGMA journal_mode` returns `wal` and `PRAGMA foreign_keys` returns `1` after app start
- [x] 3.3 Confirm `languages` table contains the `en` row after first launch
- [x] 3.4 Restart the app and confirm `_migrations` row count is stable (no duplicate migrations)
