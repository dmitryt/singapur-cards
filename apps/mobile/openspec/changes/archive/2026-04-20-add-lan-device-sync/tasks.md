## 1. Spec And Schema Preparation

- [x] 1.1 Add sync metadata schema definitions for `sync_devices`, `sync_changes`, `sync_cursors`, `sync_tombstones`, and `sync_state`
- [x] 1.2 Define which existing domain tables participate in sync v1 and explicitly exclude `ai_credentials` plus file/blob data
- [x] 1.3 Document the per-table conflict strategy for `review_events`, `collection_memberships`, `cards`, `collections`, and `chat_conversations`

## 2. Mobile Pairing UX

- [x] 2.1 Add a sync management screen that shows current pairing state, last sync status, and a manual "Sync now" action
- [x] 2.2 Add manual pairing entry for host, port, and pairing token
- [x] 2.3 Validate and persist manual pairing details for reconnect and sync
- [x] 2.4 Persist the trusted desktop identity and credential locally after successful pairing
- [x] 2.5 Add a disconnect / forget desktop action

## 3. Mobile Sync Engine

- [x] 3.1 Add mutation logging so local writes to synced tables append entries to `sync_changes`
- [x] 3.2 Add delete propagation using `sync_tombstones` for synced tables that allow deletion
- [x] 3.3 Implement the manual sync operation: upload local changes, receive remote changes, apply them transactionally, and advance per-peer cursors
- [x] 3.4 Record last sync timestamp, success state, and last error in `sync_state`
- [x] 3.5 Surface sync failures and partial-apply errors clearly in the mobile UI

## 4. Desktop Coordination

- [x] 4.1 Add desktop pairing mode that generates a short-lived pairing token plus manual host/port/code payload
- [x] 4.2 Add desktop endpoints for pairing completion and pull-push sync
- [x] 4.3 Apply the same conflict rules and cursor semantics on the desktop side
- [x] 4.4 Persist desktop-side trusted devices and sync cursors

## 5. Validation

- [x] 5.1 Verify that first-time pairing succeeds with desktop-provided host/port/code details
- [x] 5.2 Verify that manual pairing input validation and error handling are clear to the user
- [x] 5.3 Verify that a mobile-created `review_event` appears on desktop after sync
- [x] 5.4 Verify that a desktop-edited `card` or `collection` appears on mobile after sync
- [x] 5.5 Verify that simultaneous edits to the same editable row converge via the documented LWW rule
- [x] 5.6 Verify that forgotten peers can no longer sync until re-paired

## Deferred Scope

- QR-based pairing (camera scan) is deferred to a future version and is not part of v1 acceptance.
