### Feature: Desktop-Mobile Sync

#### 1. Overview
- Sync keeps card-learning data aligned between one desktop app and trusted mobile devices on the same LAN.
- Pairing is explicit and short-lived: desktop emits a 60-second code and mobile uses it to establish trust.
- After pairing, sync runs through local metadata tables that track changes, cursors, and tombstones.

#### 2. Goals & Non-Goals
- Goals:
  - Provide a clear pairing flow from desktop settings.
  - Persist trusted device records and last-sync state across restarts.
  - Enforce revocation immediately when a device is forgotten.
- Non-Goals:
  - Cloud relay or internet pairing.
  - Realtime push-based unpair propagation to mobile.
  - Multi-desktop conflict resolution in v1.

#### 3. User Stories
- A learner pairs their phone with desktop by entering host, port, and code shown on desktop.
- A learner sees paired devices and last-sync status in profile settings.
- A learner forgets a device and expects future sync attempts from that device to fail.

#### 4. Functional Requirements
- Desktop shows a `Desktop Sync` section in the existing profile/settings page.
- When no devices are paired, desktop shows `Start Pairing` and an empty-state explanation.
- `Start Pairing` calls `sync_start_pairing` and renders:
  - desktop display name
  - `host:port`
  - 6-digit code
  - per-second countdown (`Expires in X s`) for a 60-second window
- While pairing is active, desktop polls `sync_get_paired_devices` every ~2 seconds.
- Pairing view auto-transitions to paired list when a new device appears.
- If the pairing window expires, desktop returns to idle and shows an expiry notice.
- When at least one device is paired, pairing actions are hidden.
- Each paired device row shows:
  - `displayName`
  - last sync timestamp or `Never synced`
  - `Forget` action with destructive confirmation modal
- `Forget` removes trust through `sync_forget_device`, refreshes list, and re-enables pairing UI only when list is empty.

#### 5. UX / UI Description
- Location: desktop profile page (`Desktop Sync` section), no separate route.
- Pairing state:
  - prominent code block
  - copy affordance for address and code
  - explicit expiry countdown
- Paired state:
  - list of trusted mobile devices
  - one-click `Forget` guarded by confirmation
- Error state:
  - clear message when sync server is unavailable or commands fail.

#### 6. Data Model + Database Schema
```ts
type PairingModeInfo = {
  host: string
  port: number
  code: string
  expiresAt: string
  displayName: string
}

type PairedDevice = {
  id: string
  displayName: string
  pairedAt: string | null
  lastSyncAt: string | null
}
```
- Canonical sync metadata tables:
  - `sync_devices`
  - `sync_changes`
  - `sync_cursors`
  - `sync_tombstones`
  - `sync_state`
- Local writes to sync-scoped entities record outbound mutations in `sync_changes`.
- Local deletes create tombstones in `sync_tombstones` for peer propagation.
- Successful sessions persist per-peer cursors in `sync_cursors`.

#### 7. API / Integration
- Tauri commands used by desktop UI:
  - `sync_start_pairing`
  - `sync_get_paired_devices`
  - `sync_forget_device`
- Mobile and desktop sync protocol integration:
  - mobile authenticates using paired credential material
  - desktop rejects unknown/revoked devices with auth failure and stable code (for example `PAIRING_REVOKED`)
  - mobile can initiate authenticated unpair (`POST /pairing/forget`) against desktop

#### 8. State Management
- Desktop UI state machine:
  - `idle`
  - `pairing`
  - `paired`
  - `error`
- Transition triggers:
  - `idle -> pairing`: start pairing succeeds
  - `pairing -> paired`: poll detects new trusted device
  - `pairing -> idle`: timer expires
  - `paired -> idle`: forget leaves zero devices
  - `* -> error`: command failure

#### 9. Storage
- Sync metadata is persisted in local SQLite and loaded on startup.
- Device trust records survive app restarts.
- Last sync timestamps surface from stored peer records.

#### 10. Platforms
- Desktop: sync UI, local LAN sync server, and trust management implemented.
- Mobile: pairing + sync client behavior specified through OpenSpec and wired to the same metadata model.

#### 11. Permissions & Security
- Pairing codes are short-lived and single-session.
- Destructive trust removal requires explicit confirmation.
- Revoked devices are denied on next authenticated sync attempt.
- No remote cloud broker in v1; trust remains local-network scoped.

#### 12. Error Handling
- If sync server fails to initialize, desktop enters explicit unavailable/error state.
- Expired pairing sessions are non-fatal and immediately restartable.
- Failed forget/unpair operations keep previous trust state and show recoverable feedback.

#### 13. Analytics
- Not specified in current command contracts.
- Suggested metrics:
  - pairing start -> success conversion
  - pairing expiry rate
  - forget-device frequency
  - sync auth rejection counts by reason code

#### 14. Open Questions
- Should desktop support pairing multiple mobile devices simultaneously in future versions?
- Should last-sync display include relative time and timezone normalization?
- Should desktop expose manual sync diagnostics for failed-device troubleshooting?

#### 15. Future Improvements
- Add proactive device health indicators (last seen, last auth failure reason).
- Add optional QR-based pairing payload in desktop UI.
- Add conflict visualization for difficult merge scenarios.
