## Context

The mobile app uses `expo-sqlite` with Drizzle-managed schema definitions and local-first state. The desktop app lives in the same monorepo and already has a Tauri/Rust runtime with SQLite access and secure credential storage. The requested sync feature must work without any hosted backend, which rules out server-centric sync products and makes LAN transport the practical v1 target.

## Goals / Non-Goals

**Goals:**
- Pair mobile with desktop on the same local network using QR or manual entry
- Persist a trusted desktop identity so future sync sessions do not require repeated pairing
- Support manual, foreground, bidirectional sync while both apps are open
- Synchronize normal SQLite row data for cards, collections, memberships, review events, and related study metadata
- Resolve conflicts with deterministic rules that are simple enough for a first release

**Non-Goals:**
- Internet-wide sync without a relay or backend
- Background or periodic sync
- Automatic LAN discovery in v1
- Raw `.sqlite` file copy or low-level replication
- Synchronizing secrets (`ai_credentials`) or media/blob assets in v1
- Full CRDT integration in v1

## V1 Data Scope

The first implementation should synchronize only these data groups:

- `cards`
- `collections`
- `collection_memberships`
- `review_events`
- `chat_conversations`
- `chat_messages`
- `custom_chat_models`

The first implementation should explicitly exclude these groups:

- `ai_credentials`
- `dictionaries` and `dictionary_entries`
- rows whose meaning depends on local file paths or local imported source files
- binary/blob asset payloads

**Why exclude dictionaries initially**: they can be large, are often imported from files, and will inflate both sync payload size and conflict surface area. They can be added later once the sync loop is proven on smaller, high-value study data.

## V1 Delivery Scope

The first implementation should ship in two layers:

- **Phase 1 vertical slice**: `review_events`, `cards`, `collections`, `collection_memberships`
- **Phase 2 expansion within v1**: `chat_conversations`, `chat_messages`, `custom_chat_models`

This keeps the first end-to-end implementation focused on the highest-value study data before chat-related tables are added.

## Decisions

### Transport: desktop-hosted HTTP sync on the same LAN

**Decision**: The desktop app hosts a local HTTP sync service. The mobile app connects to that service after pairing and uses normal request/response sync calls.

**Why**: HTTP is simpler to implement, inspect, retry, and secure than WebRTC or a persistent socket protocol. Because sync is user-triggered in v1, request/response fits the interaction model well.

**Alternative rejected**: WebRTC peer-to-peer transport. It adds signaling, NAT traversal, and more complicated lifecycle handling with little user-visible benefit for same-LAN manual sync.

### Discovery: QR and manual entry only

**Decision**: v1 supports QR scanning and manual entry of connection details or pairing code. It does not require mDNS or Bonjour auto-discovery.

**Why**: This is the simplest reliable flow and avoids native discovery dependencies in Expo during the first implementation.

### Pairing model: short-lived pairing token, long-lived trusted peer

**Decision**: The desktop app enters pairing mode and displays a QR payload containing its device ID, host, port, short-lived pairing token, and expiry timestamp. The mobile app scans or enters the same details manually, then exchanges device identity with the desktop and stores a long-lived trusted peer record locally.

**Why**: The short-lived token keeps initial pairing simple while still preventing arbitrary LAN devices from syncing without user consent. Persisting trusted peer records avoids repeated re-pairing.

**Credential storage**:
- mobile stores the trusted desktop record plus long-lived credential in local secure storage or an equivalent protected store
- desktop stores trusted mobile device records in its local database and/or platform-backed secure storage
- pairing tokens are single-use or short-lived and must not be reused as long-lived sync credentials

**Authentication and replay protection**:
- the pairing token is used only to bootstrap trust and expires quickly
- the completed pairing returns a long-lived shared secret or equivalent credential bound to the specific mobile/desktop device IDs
- every sync request includes a request ID plus a timestamp or nonce
- the request is authenticated with the long-lived credential so a replayed or tampered request is rejected

**Transport expectation**:
- v1 may use plain HTTP on the trusted LAN if implementation speed is the priority
- even on HTTP, sync requests must still be authenticated at the application layer
- if HTTPS on LAN is feasible in the desktop runtime, it is preferred but not required for the first vertical slice

### Sync model: application-level change log, not database-file replication

**Decision**: Both sides track row-level mutations in explicit sync metadata tables and exchange changes after a per-peer cursor.

**Why**: The current schema is well-suited to row sync. Application-level change records are portable across Expo SQLite and desktop SQLite, and they avoid platform-specific file locking and replication concerns.

**Tracked metadata tables**:
- `sync_devices`: known local and remote device identities
- `sync_changes`: local mutation log entries for rows that should sync
- `sync_cursors`: the last acknowledged change per peer and direction
- `sync_tombstones`: delete records for rows that must remain deleted across devices
- `sync_state`: current pairing state, last sync summary, and failure metadata

Recommended `sync_changes` fields:

- `id`
- `request_id`
- `device_id`
- `table_name`
- `row_id`
- `op_type`
- `logical_clock`
- `updated_at`
- `payload_json`
- `created_at`
- `applied_at`

Recommended `sync_tombstones` fields:

- `id`
- `request_id`
- `device_id`
- `table_name`
- `row_id`
- `logical_clock`
- `deleted_at`

Recommended `sync_cursors` fields:

- `peer_device_id`
- `last_remote_logical_clock`
- `last_acknowledged_local_logical_clock`
- `updated_at`

### Conflict handling: hybrid merge strategy

**Decision**:
- Append-only tables such as `review_events` merge by primary key
- Membership-style tables such as `collection_memberships` behave like sets, with tombstones propagating removals
- Editable entities such as `cards`, `collections`, and `chat_conversations` use last-writer-wins by `updated_at`, with `device_id` as a deterministic tie-breaker
- If one device deletes a row while the other edits it, the newer operation wins by comparing tombstone `deleted_at` against row `updated_at`; ties are broken by deterministic `device_id`

**Why**: This handles the app's current data shapes without taking on the complexity of CRDTs.

### Scope of synchronized data

**Decision**: Sync normal structured rows only. v1 excludes `ai_credentials`, binary assets, imported source files, and any data that depends on platform-specific secrets or filesystem paths.

**Why**: Secrets should not silently move between devices, and file synchronization is materially more complex than row synchronization.

## API Shape

The exact wire format can evolve, but the first implementation should align around these desktop-hosted endpoints:

- `POST /pairing/start` — desktop enters pairing mode and returns the payload used to render the QR code
- `POST /pairing/complete` — mobile submits pairing token plus its device identity; desktop returns a long-lived trust credential
- `POST /sync/pull-push` — mobile sends unsynced local changes and its current cursor, desktop applies them, then returns remote changes since that cursor

Recommended sync request body:

- `mobileDeviceId`
- `desktopDeviceId`
- `authToken`
- `requestId`
- `requestTimestamp`
- `knownRemoteCursor`
- `knownAckedLocalCursor`
- `changes`
- `tombstones`
- `protocolVersion`

Recommended sync response body:

- `acceptedLocalCursor`
- `remoteCursor`
- `requestId`
- `changes`
- `tombstones`
- `serverTime`
- `conflictsSummary`

Recommended QR payload fields:

- `desktopDeviceId`
- `desktopDisplayName`
- `host`
- `port`
- `pairingToken`
- `expiresAt`
- `protocolVersion`

## Sync Session Sequence

The first implementation should follow this sequence:

1. User taps `Sync now` on mobile
2. Mobile loads the paired desktop record and current cursor
3. Mobile collects unsent `sync_changes` and `sync_tombstones`
4. Mobile sends a single `pull-push` request to desktop
5. Desktop authenticates the request and applies incoming changes in a transaction
6. Desktop deduplicates the request by `requestId` and does not re-apply already accepted local operations
7. Desktop computes all remote changes newer than the mobile cursor
8. Desktop returns remote changes plus the new authoritative remote cursor and the accepted local cursor
9. Mobile applies remote changes in a transaction
10. Mobile advances the stored cursor only after local apply succeeds
11. Mobile marks local operations as acknowledged only after the response confirms `acceptedLocalCursor`
10. Mobile records success or failure in `sync_state`

**Failure rule**: if remote changes cannot be applied locally, the mobile app must not advance the cursor and must preserve the failure details for retry or support visibility.

## Risks / Trade-offs

- **No auto-discovery in v1** → Users must scan or manually enter pairing details. Accepted to keep the first build simpler.
- **Manual sync only** → Data may remain stale until the user taps Sync. Accepted for the first release because background sync would multiply complexity on both mobile platforms.
- **Application-managed change tracking** → Every synced mutation must consistently record a change entry. This increases implementation discipline but keeps the sync engine understandable and testable.
- **LWW on editable rows** → Some simultaneous edits may overwrite each other. Accepted because the current data model is mostly single-user study data, not collaborative multi-user content.

## Migration Plan

1. Add sync metadata tables to the shared mobile schema and corresponding migrations
2. Introduce a sync layer that records local mutations for synced tables
3. Add mobile UI for pairing, trusted desktop status, and manual sync
4. Implement desktop pairing and sync endpoints
5. Validate sync on a narrow table set first: `review_events`, `cards`, `collections`, `collection_memberships`
6. Expand sync coverage to the remaining in-scope tables after the first vertical slice is stable
