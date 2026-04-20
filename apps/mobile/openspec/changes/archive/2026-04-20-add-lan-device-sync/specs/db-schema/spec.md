## MODIFIED Requirements

### Requirement: Canonical tables exist after first migration run
The app SHALL create all canonical tables (`languages`, `dictionaries`, `dictionary_entries`, `cards`, `collections`, `collection_memberships`, `review_events`, `ai_credentials`, `chat_conversations`, `chat_messages`, `custom_chat_models`) and the sync metadata tables (`sync_devices`, `sync_changes`, `sync_cursors`, `sync_tombstones`, `sync_state`) plus their indexes via migrations applied at startup.

#### Scenario: Sync metadata tables are present after sync schema migration
- **WHEN** the app is launched on a device with the sync feature migration available
- **THEN** `sync_devices`, `sync_changes`, `sync_cursors`, `sync_tombstones`, and `sync_state` exist in the SQLite database and can be queried without error

#### Scenario: Sync metadata indexes are present after sync schema migration
- **WHEN** the sync feature migration has been applied
- **THEN** the indexes required for change ordering, per-peer cursor lookup, and tombstone lookup exist in the database

### Requirement: Sync metadata records trusted peers and unsent changes
The app SHALL persist enough sync metadata to identify trusted peers, track local row mutations, and resume sync from the last acknowledged cursor.

#### Scenario: Local mutation records a sync change
- **WHEN** the app creates or updates a row in a table that participates in sync v1
- **THEN** a corresponding entry is recorded in `sync_changes` with the row identity, operation type, originating device identity, and ordering metadata

#### Scenario: Local delete records a tombstone
- **WHEN** the app deletes a row from a table that participates in sync v1
- **THEN** a corresponding entry is recorded in `sync_tombstones` so the deletion can be propagated to peers

#### Scenario: Per-peer cursor is persisted after successful sync
- **WHEN** a sync session completes successfully with a paired desktop
- **THEN** the app stores the latest acknowledged remote cursor for that desktop in `sync_cursors`
