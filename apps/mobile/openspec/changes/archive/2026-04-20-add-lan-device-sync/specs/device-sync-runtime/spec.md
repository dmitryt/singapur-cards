## ADDED Requirements

### Requirement: Manual sync exchanges local and remote changes with the paired desktop
The app SHALL provide a user-triggered sync action that sends the mobile device's unsent local changes to the paired desktop and then applies all remote changes returned by the desktop since the mobile device's current cursor. Each sync request SHALL include a stable request identifier so retries can be deduplicated safely.

#### Scenario: Sync uploads local changes and downloads remote changes
- **WHEN** the user taps "Sync now" while a trusted desktop is paired and reachable on the same LAN
- **THEN** the app uploads its unsent changes, receives remote changes after its current cursor, applies them transactionally, and advances the stored cursor

#### Scenario: No-op sync leaves cursor unchanged
- **WHEN** the user starts a sync and neither side has new changes to exchange
- **THEN** the sync completes successfully without applying changes and the app records a successful no-op sync result

#### Scenario: Retried sync request is deduplicated
- **WHEN** the mobile app retries a previously sent sync request with the same request identifier after a timeout or uncertain network failure
- **THEN** the desktop app does not re-apply already accepted local operations and returns the same acknowledged result semantics for that request

#### Scenario: Local changes are acknowledged only after explicit acceptance
- **WHEN** the mobile app receives a sync response
- **THEN** it marks uploaded local changes as acknowledged only after the response confirms the accepted local cursor or equivalent acknowledgment marker

### Requirement: Sync supports only in-scope structured SQLite data in v1
The app SHALL synchronize only the structured row data defined for sync v1 and SHALL exclude secrets, binary assets, and filesystem-dependent content.

#### Scenario: Secret rows are excluded from sync
- **WHEN** a sync session is built from local unsent changes
- **THEN** rows from excluded tables such as `ai_credentials` are not included in the sync payload

#### Scenario: File or blob content is excluded from sync
- **WHEN** data depends on a local filesystem path or binary asset transfer
- **THEN** the app does not attempt to synchronize that content as part of v1 sync

### Requirement: Sync resolves conflicts deterministically
The app SHALL apply the documented hybrid conflict strategy so that repeated syncs converge deterministically.

#### Scenario: Append-only review events merge by primary key
- **WHEN** the same card has review events created independently on mobile and desktop before the next sync
- **THEN** both sets of `review_events` are preserved after sync, subject to primary-key deduplication

#### Scenario: Editable rows use last-writer-wins
- **WHEN** the same editable row is changed on mobile and desktop before the next sync
- **THEN** the row with the later `updated_at` wins, and if timestamps are equal the higher-priority deterministic `device_id` tie-breaker wins

#### Scenario: Delete versus update uses newer operation
- **WHEN** one device deletes a synced editable row and the other device updates that same row before the next sync
- **THEN** the newer operation wins by comparing tombstone `deleted_at` with row `updated_at`, and equal timestamps are resolved by deterministic `device_id` tie-breaker

#### Scenario: Membership deletions propagate through tombstones
- **WHEN** a synced membership row is removed on one device before the next sync
- **THEN** the removal is propagated to the other device and the row is not silently recreated by an older snapshot

### Requirement: Sync reports the latest result to the user
The app SHALL persist and display the outcome of the most recent sync attempt.

#### Scenario: Successful sync updates status
- **WHEN** a sync session completes successfully
- **THEN** the app records the completion time and shows that the latest sync succeeded

#### Scenario: Failed sync preserves local data and shows an error
- **WHEN** a sync request fails because the desktop is unreachable, authentication fails, or remote changes cannot be applied
- **THEN** the app leaves existing local data intact, records the failure, and shows an actionable error to the user
