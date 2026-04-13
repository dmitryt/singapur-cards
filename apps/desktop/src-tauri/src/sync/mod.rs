pub mod server;
pub mod types;

// TODO: Add a `sync_state` table to the desktop schema (mirrors the mobile `sync_state` table).
// This would give the desktop a persistent record of pairing status across restarts — right now
// the pairing session is in-memory only. The desktop can infer "I have a paired peer" from
// `sync_devices WHERE is_local = 0`, but an explicit `sync_state` row would also hold last-sync
// timestamp and last-error for display in the UI.
// See: src/db/schema.rs → run_migrations()

// TODO: Add a desktop sync UI panel in ProfilePage (or a dedicated SyncPage).
// The Tauri backend exposes three commands already:
//   - sync_start_pairing   → shows host, port, and 6-digit code to display to the user
//   - sync_get_paired_devices → lists trusted mobile devices
//   - sync_forget_device   → removes a trusted mobile device
// The frontend just needs a Settings → Desktop Sync section that calls them.
// Suggested flow:
//   1. "Start pairing" button → calls sync_start_pairing → shows host:port + code for 60 s
//   2. List of paired mobile devices with last-sync time
//   3. "Forget" button per device
// See: src/pages/ProfilePage.tsx, src/App.tsx (add /sync route if desired)

use std::net::IpAddr;

use tauri::State;

use crate::state::SyncHandle;
use server::start_pairing;
use types::PairingModeInfo;

/// Tauri command: start pairing mode. Returns host, port, and 6-digit code for display.
#[tauri::command]
pub fn sync_start_pairing(sync: State<'_, SyncHandle>) -> Result<PairingModeInfo, String> {
    let state = sync.0.as_ref().ok_or("Sync server not initialized")?;
    let host = get_local_ip().unwrap_or_else(|| "127.0.0.1".to_string());
    start_pairing(state, host)
}

/// Tauri command: get paired mobile devices.
#[tauri::command]
pub fn sync_get_paired_devices(
    sync: State<'_, SyncHandle>,
) -> Result<Vec<serde_json::Value>, String> {
    let state = sync.0.as_ref().ok_or("Sync server not initialized")?;
    let conn = state.conn.lock().map_err(|_| "DB lock poisoned")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, display_name, paired_at, last_sync_at
             FROM sync_devices WHERE is_local = 0",
        )
        .map_err(|e| e.to_string())?;

    let devices = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "displayName": row.get::<_, String>(1)?,
                "pairedAt": row.get::<_, Option<String>>(2)?,
                "lastSyncAt": row.get::<_, Option<String>>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(devices)
}

/// Tauri command: forget a paired mobile device.
#[tauri::command]
pub fn sync_forget_device(
    sync: State<'_, SyncHandle>,
    device_id: String,
) -> Result<(), String> {
    let state = sync.0.as_ref().ok_or("Sync server not initialized")?;
    let conn = state.conn.lock().map_err(|_| "DB lock poisoned")?;
    conn.execute(
        "DELETE FROM sync_devices WHERE id = ?1 AND is_local = 0",
        rusqlite::params![device_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Helper: get the machine's primary LAN IP
// ---------------------------------------------------------------------------

fn get_local_ip() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let addr = socket.local_addr().ok()?;
    match addr.ip() {
        IpAddr::V4(ip) if !ip.is_loopback() => Some(ip.to_string()),
        _ => None,
    }
}
