# Data Model: Desktop Sync UI (005)

## Entities

### PairingModeInfo (backend → frontend)

Returned by `sync_start_pairing`. **Requires backend addition of `displayName`.**

| Field | Type | Notes |
|---|---|---|
| `host` | `string` | LAN IP address of this desktop |
| `port` | `number` | HTTP server port |
| `code` | `string` | 6-digit pairing code |
| `expiresAt` | `string` | ISO 8601 timestamp; 60 seconds from call |
| `displayName` | `string` | Desktop's own display name (e.g. "Desktop") — **ADD TO RUST** |

**Backend change required**: `src-tauri/src/sync/types.rs` → add `display_name: String` to `PairingModeInfo`. `src-tauri/src/sync/server.rs` → populate it from `state.local_display_name` in `start_pairing()`.

---

### PairedDevice (backend → frontend)

Returned as array by `sync_get_paired_devices`. Currently returned as `serde_json::Value` — frontend types this explicitly.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Device UUID |
| `displayName` | `string` | Mobile device's human name |
| `pairedAt` | `string \| null` | ISO 8601 pairing timestamp |
| `lastSyncAt` | `string \| null` | ISO 8601 last sync timestamp; `null` → show "Never synced" |

---

## UI State (local component state in `DesktopSyncSection`)

```typescript
type SyncView =
  | { kind: "idle" }
  | { kind: "pairing"; info: PairingModeInfo; secondsRemaining: number }
  | { kind: "paired"; devices: PairedDevice[] }
  | { kind: "error"; message: string };
```

| State | Trigger |
|---|---|
| `idle` | Initial mount with devices; also after pairing expires with no device found |
| `pairing` | After `sync_start_pairing` succeeds |
| `paired` | On mount if devices exist; after polling detects new device |
| `error` | When any command returns `ok: false` (including server not initialized) |

**Note**: On mount, `sync_get_paired_devices` is called first. If the result has ≥1 device, the view starts in `paired`. If 0 devices, starts in `idle`. If error, starts in `error`.

---

## State Transitions

```
idle ──[Start Pairing]──► pairing
pairing ──[device detected]──► paired
pairing ──[timer expires]──► idle (with expiry notice)
paired ──[Forget confirmed]──► paired (re-fetch list)
paired ──[list becomes empty]──► idle
* ──[command error]──► error
```

---

## Backend DB (read-only from frontend perspective)

The `sync_devices` table (already exists):

```sql
CREATE TABLE sync_devices (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  is_local INTEGER NOT NULL,  -- 1 = this desktop, 0 = mobile peer
  credential TEXT,
  paired_at TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL
);
```

The frontend queries this indirectly via `sync_get_paired_devices` (which filters `is_local = 0`).
