## Why

The app currently stores data locally on each device with no supported way to move cards, collections, or review progress between the desktop and mobile apps. Users who study on both devices end up with diverging datasets and duplicated setup work. A lightweight local-network sync flow keeps the product offline-first and avoids introducing a backend.

## What Changes

- Add a **manual local-network sync flow** between the desktop and mobile apps, initiated by the user while both apps are open on the same LAN
- Add **desktop-led pairing** using manually entered connection details plus a short-lived pairing code
- Add a **mobile sync status surface** that shows the paired desktop, last sync result, and a manual "Sync now" action
- Add **sync metadata storage** in SQLite so the app can track trusted peers, local changes, deletions, and per-peer cursors
- Define a **hybrid conflict policy**: append-only facts merge by ID, editable rows use last-writer-wins by `updated_at` with `device_id` tie-breaker

## Capabilities

### New Capabilities
- `device-sync-pairing`: Pair a mobile device with a desktop app on the same LAN using manual host/port + code entry, then persist the trust relationship for later sync sessions
- `device-sync-runtime`: Run a user-triggered bidirectional sync session over the local network, uploading local changes and downloading remote changes

### Modified Capabilities
- `db-schema`: The canonical mobile schema now includes sync metadata tables required for peer trust, change tracking, cursors, and delete propagation

## Impact

- `src/db/` — schema and migrations gain sync metadata tables and local mutation logging hooks
- `src/app/` — new pairing and sync-management UI, including manual pairing entry and sync status
- `src/store/` or `src/lib/` — sync orchestration, cursor management, conflict handling, and status state
- `apps/desktop/src-tauri/` — coordinated desktop-side LAN transport, pairing, and sync endpoints will be required for end-to-end behavior
- v1 explicitly excludes background sync, internet relay, auto-discovery, raw SQLite file replication, and media/blob synchronization
