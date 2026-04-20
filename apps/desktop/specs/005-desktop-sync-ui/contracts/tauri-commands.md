# Tauri Command Contracts: Desktop Sync UI

These are the three sync commands the frontend must wire up. All are already registered in `src-tauri/src/lib.rs`. The frontend wrappers go in `src/lib/tauri/commands.ts`.

---

## `sync_start_pairing`

**Direction**: Frontend → Tauri backend  
**Rust handler**: `sync::sync_start_pairing`  
**Returns on success**: `PairingModeInfo`  
**Returns on failure**: throws (Tauri rejects) with a string error message

### Input
None (no arguments).

### Output
```typescript
type PairingModeInfo = {
  host: string;        // LAN IP, e.g. "192.168.1.42"
  port: number;        // HTTP port, e.g. 8765
  code: string;        // 6-digit string, e.g. "042817"
  expiresAt: string;   // ISO 8601, 60s from call
  displayName: string; // Desktop display name — REQUIRES BACKEND ADDITION
};
```

### Frontend wrapper signature
```typescript
export async function syncStartPairing(): Promise<CommandResult<PairingModeInfo>>
```

### Error conditions
- `"Sync server not initialized"` — desktop sync server failed to start on app launch; show error state.

---

## `sync_get_paired_devices`

**Direction**: Frontend → Tauri backend  
**Rust handler**: `sync::sync_get_paired_devices`  
**Returns on success**: array of paired device records  
**Returns on failure**: throws with string error

### Input
None.

### Output
```typescript
type PairedDevice = {
  id: string;
  displayName: string;
  pairedAt: string | null;    // ISO 8601 or null
  lastSyncAt: string | null;  // ISO 8601 or null
};
```

### Frontend wrapper signature
```typescript
export async function syncGetPairedDevices(): Promise<CommandResult<PairedDevice[]>>
```

### Error conditions
- `"Sync server not initialized"` — show error state.

---

## `sync_forget_device`

**Direction**: Frontend → Tauri backend  
**Rust handler**: `sync::sync_forget_device`  
**Returns on success**: `void` (`null` in JSON)  
**Returns on failure**: throws with string error

### Input
```typescript
// Tauri receives snake_case: { device_id: string }
syncForgetDevice(deviceId: string)
```

### Output
`void` — no payload on success.

### Frontend wrapper signature
```typescript
export async function syncForgetDevice(deviceId: string): Promise<CommandResult<void>>
```

### Error conditions
- `"Sync server not initialized"` — show error state.
- DB errors — surface as generic error message.

---

## Wrapper error normalization pattern

All three wrappers use try/catch to normalize Tauri throws into `CommandResult`:

```typescript
try {
  const data = await invoke<T>("command_name", args);
  return { ok: true, data };
} catch (e) {
  return { ok: false, code: "UNEXPECTED_ERROR", message: String(e) };
}
```
