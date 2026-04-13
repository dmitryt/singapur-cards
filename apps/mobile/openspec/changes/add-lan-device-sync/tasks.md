## 1. Spec And Schema Preparation

- [x] 1.1 Add sync metadata schema definitions for `sync_devices`, `sync_changes`, `sync_cursors`, `sync_tombstones`, and `sync_state`
- [x] 1.2 Define which existing domain tables participate in sync v1 and explicitly exclude `ai_credentials` plus file/blob data
- [x] 1.3 Document the per-table conflict strategy for `review_events`, `collection_memberships`, `cards`, `collections`, and `chat_conversations`

## 2. Mobile Pairing UX

- [x] 2.1 Add a sync management screen that shows current pairing state, last sync status, and a manual "Sync now" action
- [x] 2.2 Add QR scanning flow for pairing using `expo-camera` (replaced with 6-digit code + manual entry per design decision)
- [x] 2.3 Add manual pairing fallback for host, port, and pairing token entry
- [x] 2.4 Persist the trusted desktop identity and credential locally after successful pairing
- [x] 2.5 Add a disconnect / forget desktop action

## 3. Mobile Sync Engine

- [x] 3.1 Add mutation logging so local writes to synced tables append entries to `sync_changes`
- [x] 3.2 Add delete propagation using `sync_tombstones` for synced tables that allow deletion
- [x] 3.3 Implement the manual sync operation: upload local changes, receive remote changes, apply them transactionally, and advance per-peer cursors
- [x] 3.4 Record last sync timestamp, success state, and last error in `sync_state`
- [x] 3.5 Surface sync failures and partial-apply errors clearly in the mobile UI

## 4. Desktop Coordination

- [x] 4.1 Add desktop pairing mode that generates a short-lived pairing token and QR payload
- [x] 4.2 Add desktop endpoints for pairing completion and pull-push sync
- [x] 4.3 Apply the same conflict rules and cursor semantics on the desktop side
- [x] 4.4 Persist desktop-side trusted devices and sync cursors

## 5. Validation

- [x] 5.1 Verify that first-time pairing succeeds via QR scan (N/A — replaced by 6-digit code per design decision)
- [x] 5.2 Verify that manual pairing succeeds when QR scan is unavailable
- [x] 5.3 Verify that a mobile-created `review_event` appears on desktop after sync
- [x] 5.4 Verify that a desktop-edited `card` or `collection` appears on mobile after sync
- [x] 5.5 Verify that simultaneous edits to the same editable row converge via the documented LWW rule
- [x] 5.6 Verify that forgotten peers can no longer sync until re-paired
