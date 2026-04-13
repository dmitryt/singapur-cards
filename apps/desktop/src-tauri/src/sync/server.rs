use std::sync::{Arc, Mutex};

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
    Json, Router,
};
use chrono::Utc;
use rusqlite::{Connection, OptionalExtension};
use serde_json::Value;
use uuid::Uuid;

use super::types::{
    ConflictSummary, PairingCompleteRequest, PairingCompleteResponse, PairingModeInfo,
    PullPushRequest, PullPushResponse, SyncChange, SyncTombstone, PROTOCOL_VERSION,
};

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct PairingSession {
    pub code: String,
    pub expires_at: chrono::DateTime<Utc>,
    pub used: bool,
}

pub struct SyncServerState {
    pub conn: Arc<Mutex<Connection>>,
    pub pairing_session: Mutex<Option<PairingSession>>,
    pub local_device_id: String,
    pub local_display_name: String,
    pub port: u16,
}

pub type SharedSyncState = Arc<SyncServerState>;

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

struct SyncError(StatusCode, String);

impl IntoResponse for SyncError {
    fn into_response(self) -> Response {
        (self.0, self.1).into_response()
    }
}

impl From<rusqlite::Error> for SyncError {
    fn from(e: rusqlite::Error) -> Self {
        SyncError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    }
}

type SyncResult<T> = std::result::Result<T, SyncError>;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn make_router(state: SharedSyncState) -> Router {
    Router::new()
        .route("/pairing/complete", post(handle_pairing_complete))
        .route("/sync/pull-push", post(handle_pull_push))
        .with_state(state)
}

// ---------------------------------------------------------------------------
// Pairing complete handler
// ---------------------------------------------------------------------------

async fn handle_pairing_complete(
    State(state): State<SharedSyncState>,
    Json(req): Json<PairingCompleteRequest>,
) -> SyncResult<Json<PairingCompleteResponse>> {
    if req.protocol_version != PROTOCOL_VERSION {
        return Err(SyncError(
            StatusCode::BAD_REQUEST,
            format!(
                "Protocol version mismatch: expected {}, got {}",
                PROTOCOL_VERSION, req.protocol_version
            ),
        ));
    }

    // Validate pairing session
    {
        let mut session_guard = state
            .pairing_session
            .lock()
            .map_err(|_| SyncError(StatusCode::INTERNAL_SERVER_ERROR, "Lock poisoned".into()))?;

        let session = session_guard.as_mut().ok_or_else(|| {
            SyncError(StatusCode::CONFLICT, "No active pairing session".into())
        })?;

        if session.used {
            return Err(SyncError(
                StatusCode::CONFLICT,
                "Pairing token already used".into(),
            ));
        }
        if Utc::now() > session.expires_at {
            return Err(SyncError(
                StatusCode::GONE,
                "Pairing token expired".into(),
            ));
        }
        if session.code != req.pairing_token {
            return Err(SyncError(
                StatusCode::UNAUTHORIZED,
                "Invalid pairing token".into(),
            ));
        }
        session.used = true;
    }

    let credential = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Persist trusted mobile device
    {
        let conn = state
            .conn
            .lock()
            .map_err(|_| SyncError(StatusCode::INTERNAL_SERVER_ERROR, "DB lock poisoned".into()))?;

        conn.execute(
            "INSERT INTO sync_devices (id, display_name, is_local, credential, paired_at, created_at)
             VALUES (?1, ?2, 0, ?3, ?4, ?4)
             ON CONFLICT(id) DO UPDATE SET
               display_name = excluded.display_name,
               credential = excluded.credential,
               paired_at = excluded.paired_at",
            rusqlite::params![req.mobile_device_id, req.mobile_display_name, credential, now],
        )?;

        // Ensure cursor row exists
        conn.execute(
            "INSERT OR IGNORE INTO sync_cursors (peer_device_id, last_remote_logical_clock, last_acknowledged_local_logical_clock, updated_at)
             VALUES (?1, 0, 0, ?2)",
            rusqlite::params![req.mobile_device_id, now],
        )?;
    }

    Ok(Json(PairingCompleteResponse {
        desktop_device_id: state.local_device_id.clone(),
        desktop_display_name: state.local_display_name.clone(),
        sync_credential: credential,
    }))
}

// ---------------------------------------------------------------------------
// Pull-push sync handler
// ---------------------------------------------------------------------------

async fn handle_pull_push(
    State(state): State<SharedSyncState>,
    Json(req): Json<PullPushRequest>,
) -> SyncResult<Json<PullPushResponse>> {
    if req.protocol_version != PROTOCOL_VERSION {
        return Err(SyncError(
            StatusCode::BAD_REQUEST,
            format!(
                "Protocol version mismatch: expected {}, got {}",
                PROTOCOL_VERSION, req.protocol_version
            ),
        ));
    }

    let conn = state
        .conn
        .lock()
        .map_err(|_| SyncError(StatusCode::INTERNAL_SERVER_ERROR, "DB lock poisoned".into()))?;

    // Authenticate
    let stored_credential: Option<String> = conn
        .query_row(
            "SELECT credential FROM sync_devices WHERE id = ?1 AND is_local = 0",
            rusqlite::params![req.mobile_device_id],
            |row| row.get(0),
        )
        .optional()?;

    let stored_credential = stored_credential.ok_or_else(|| {
        SyncError(StatusCode::UNAUTHORIZED, "Unknown mobile device".into())
    })?;

    if stored_credential != req.auth_token {
        return Err(SyncError(
            StatusCode::UNAUTHORIZED,
            "Invalid auth token".into(),
        ));
    }

    // Deduplicate by request_id
    let last_request_id: Option<String> = conn
        .query_row(
            "SELECT last_sync_request_id FROM sync_devices WHERE id = ?1",
            rusqlite::params![req.mobile_device_id],
            |row| row.get(0),
        )
        .optional()?
        .flatten();

    let is_replay = last_request_id.as_deref() == Some(req.request_id.as_str());

    let now = Utc::now().to_rfc3339();

    // Load current cursor for this mobile peer
    let (last_remote_clock, last_acked_local_clock): (i64, i64) = conn
        .query_row(
            "SELECT last_remote_logical_clock, last_acknowledged_local_logical_clock
             FROM sync_cursors WHERE peer_device_id = ?1",
            rusqlite::params![req.mobile_device_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or((0, 0));

    let mut conflicts_summary = Vec::new();

    // Apply mobile changes (skipped if replay)
    if !is_replay {
        let tx = conn.unchecked_transaction()?;

        // Apply tombstones first
        for tombstone in &req.tombstones {
            apply_tombstone(&tx, tombstone, &state.local_device_id, &req.request_id)?;
        }

        // Apply changes
        for change in &req.changes {
            let conflict = apply_change(
                &tx,
                change,
                &state.local_device_id,
                &req.request_id,
            )?;
            if let Some(c) = conflict {
                conflicts_summary.push(c);
            }
        }

        // Advance cursor for mobile device
        let new_mobile_clock = req
            .changes
            .iter()
            .map(|c| c.logical_clock)
            .chain(req.tombstones.iter().map(|t| t.logical_clock))
            .max()
            .unwrap_or(last_remote_clock);

        tx.execute(
            "INSERT INTO sync_cursors (peer_device_id, last_remote_logical_clock, last_acknowledged_local_logical_clock, updated_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(peer_device_id) DO UPDATE SET
               last_remote_logical_clock = excluded.last_remote_logical_clock,
               updated_at = excluded.updated_at",
            rusqlite::params![req.mobile_device_id, new_mobile_clock, last_acked_local_clock, now],
        )?;

        // Mark request as processed
        tx.execute(
            "UPDATE sync_devices SET last_sync_request_id = ?1, last_sync_at = ?2 WHERE id = ?3",
            rusqlite::params![req.request_id, now, req.mobile_device_id],
        )?;

        tx.commit()?;
    }

    // Compute desktop changes newer than the mobile's cursor
    let known_cursor = req.known_remote_cursor;
    let desktop_id = &state.local_device_id;

    let remote_changes = collect_changes_since(&conn, desktop_id, known_cursor)?;
    let remote_tombstones = collect_tombstones_since(&conn, desktop_id, known_cursor)?;

    let new_remote_cursor = remote_changes
        .iter()
        .map(|c| c.logical_clock)
        .chain(remote_tombstones.iter().map(|t| t.logical_clock))
        .max()
        .unwrap_or(known_cursor);

    // Compute accepted local cursor (the max clock among all accepted mobile changes)
    let accepted_local_cursor: i64 = req
        .changes
        .iter()
        .map(|c| c.logical_clock)
        .chain(req.tombstones.iter().map(|t| t.logical_clock))
        .max()
        .unwrap_or(req.known_acked_local_cursor);

    Ok(Json(PullPushResponse {
        accepted_local_cursor,
        remote_cursor: new_remote_cursor,
        request_id: req.request_id.clone(),
        changes: remote_changes,
        tombstones: remote_tombstones,
        server_time: now,
        conflicts_summary,
    }))
}

// ---------------------------------------------------------------------------
// Apply helpers
// ---------------------------------------------------------------------------

fn apply_tombstone(
    conn: &rusqlite::Connection,
    tombstone: &SyncTombstone,
    local_device_id: &str,
    request_id: &str,
) -> SyncResult<()> {
    // Insert tombstone record (skip if already known)
    conn.execute(
        "INSERT OR IGNORE INTO sync_tombstones (id, device_id, table_name, row_id, logical_clock, request_id, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            tombstone.id, tombstone.device_id, tombstone.table_name,
            tombstone.row_id, tombstone.logical_clock, request_id, tombstone.deleted_at
        ],
    )?;

    let table = &tombstone.table_name;

    if table == "collection_memberships" {
        let parts: Vec<&str> = tombstone.row_id.splitn(2, ':').collect();
        if parts.len() == 2 {
            conn.execute(
                "DELETE FROM collection_memberships WHERE collection_id = ?1 AND card_id = ?2",
                rusqlite::params![parts[0], parts[1]],
            )?;
        }
    } else {
        // Only delete if tombstone clock >= latest local change for this row
        let local_clock: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(logical_clock), 0) FROM sync_changes WHERE table_name = ?1 AND row_id = ?2 AND device_id = ?3",
                rusqlite::params![table, tombstone.row_id, local_device_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if tombstone.logical_clock >= local_clock {
            conn.execute(
                &format!("DELETE FROM {} WHERE id = ?1", table),
                rusqlite::params![tombstone.row_id],
            )?;
        }
    }

    Ok(())
}

fn apply_change(
    conn: &rusqlite::Connection,
    change: &SyncChange,
    local_device_id: &str,
    request_id: &str,
) -> SyncResult<Option<ConflictSummary>> {
    // Skip if a tombstone with equal or higher clock already removed this row
    let tomb_clock: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(logical_clock), 0) FROM sync_tombstones WHERE table_name = ?1 AND row_id = ?2",
            rusqlite::params![change.table_name, change.row_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if tomb_clock >= change.logical_clock {
        return Ok(None);
    }

    let payload: Value = serde_json::from_str(&change.payload_json)
        .map_err(|e| SyncError(StatusCode::BAD_REQUEST, format!("Invalid payload JSON: {e}")))?;

    let table = change.table_name.as_str();
    let mut conflict_summary: Option<ConflictSummary> = None;

    match table {
        "review_events" => {
            conn.execute(
                "INSERT OR IGNORE INTO review_events (id, card_id, result, reviewed_at)
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![
                    payload["id"].as_str().unwrap_or_default(),
                    payload["card_id"].as_str().unwrap_or_default(),
                    payload["result"].as_str().unwrap_or_default(),
                    payload["reviewed_at"].as_str().unwrap_or_default()
                ],
            )?;
        }
        "collection_memberships" => {
            conn.execute(
                "INSERT OR IGNORE INTO collection_memberships (collection_id, card_id, created_at)
                 VALUES (?1, ?2, ?3)",
                rusqlite::params![
                    payload["collection_id"].as_str().unwrap_or_default(),
                    payload["card_id"].as_str().unwrap_or_default(),
                    payload["created_at"].as_str().unwrap_or_default()
                ],
            )?;
        }
        _ => {
            // LWW: compare local clock for this row
            let local_clock: i64 = conn
                .query_row(
                    "SELECT COALESCE(MAX(logical_clock), 0) FROM sync_changes WHERE table_name = ?1 AND row_id = ?2 AND device_id = ?3",
                    rusqlite::params![table, change.row_id, local_device_id],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            let should_apply = change.logical_clock > local_clock
                || (change.logical_clock == local_clock
                    && change.device_id.as_str() > local_device_id);

            if !should_apply {
                conflict_summary = Some(ConflictSummary {
                    table: table.to_string(),
                    row_id: change.row_id.clone(),
                    resolution: "local_wins".to_string(),
                });
            } else {
                upsert_row(conn, table, &payload)?;
            }
        }
    }

    // Record received change
    conn.execute(
        "INSERT OR IGNORE INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, request_id, applied_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            change.id, change.device_id, change.table_name, change.row_id,
            change.op_type, change.logical_clock, change.payload_json,
            request_id, Utc::now().to_rfc3339(), change.created_at
        ],
    )?;

    Ok(conflict_summary)
}

fn upsert_row(
    conn: &rusqlite::Connection,
    table: &str,
    payload: &Value,
) -> SyncResult<()> {
    let obj = payload
        .as_object()
        .ok_or_else(|| SyncError(StatusCode::BAD_REQUEST, "Payload is not an object".into()))?;

    let columns: Vec<&str> = obj.keys().map(String::as_str).collect();
    let placeholders: Vec<String> = (1..=columns.len()).map(|i| format!("?{i}")).collect();
    let updates: Vec<String> = columns
        .iter()
        .filter(|&&c| c != "id")
        .map(|c| format!("{c} = excluded.{c}"))
        .collect();

    let sql = format!(
        "INSERT INTO {table} ({}) VALUES ({}) ON CONFLICT(id) DO UPDATE SET {}",
        columns.join(", "),
        placeholders.join(", "),
        updates.join(", "),
    );

    let values: Vec<String> = columns
        .iter()
        .map(|&c| match &obj[c] {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => if *b { "1" } else { "0" }.to_string(),
            Value::Null => String::new(),
            other => other.to_string(),
        })
        .collect();

    let params: Vec<&dyn rusqlite::ToSql> = values
        .iter()
        .map(|v| v as &dyn rusqlite::ToSql)
        .collect();

    conn.execute(&sql, params.as_slice())?;
    Ok(())
}

fn collect_changes_since(
    conn: &rusqlite::Connection,
    device_id: &str,
    since_clock: i64,
) -> SyncResult<Vec<SyncChange>> {
    let mut stmt = conn.prepare(
        "SELECT id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at
         FROM sync_changes
         WHERE device_id = ?1 AND logical_clock > ?2
         ORDER BY logical_clock ASC",
    )?;

    let changes = stmt
        .query_map(rusqlite::params![device_id, since_clock], |row| {
            Ok(SyncChange {
                id: row.get(0)?,
                device_id: row.get(1)?,
                table_name: row.get(2)?,
                row_id: row.get(3)?,
                op_type: row.get(4)?,
                logical_clock: row.get(5)?,
                payload_json: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(changes)
}

fn collect_tombstones_since(
    conn: &rusqlite::Connection,
    device_id: &str,
    since_clock: i64,
) -> SyncResult<Vec<SyncTombstone>> {
    let mut stmt = conn.prepare(
        "SELECT id, device_id, table_name, row_id, logical_clock, deleted_at
         FROM sync_tombstones
         WHERE device_id = ?1 AND logical_clock > ?2
         ORDER BY logical_clock ASC",
    )?;

    let tombstones = stmt
        .query_map(rusqlite::params![device_id, since_clock], |row| {
            Ok(SyncTombstone {
                id: row.get(0)?,
                device_id: row.get(1)?,
                table_name: row.get(2)?,
                row_id: row.get(3)?,
                logical_clock: row.get(4)?,
                deleted_at: row.get(5)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(tombstones)
}

// ---------------------------------------------------------------------------
// Server startup and pairing mode
// ---------------------------------------------------------------------------

/// Starts the axum HTTP server on a random available port and returns a handle
/// with the bound port and shared sync state.
pub async fn start_sync_server(
    conn: Arc<Mutex<Connection>>,
    local_device_id: String,
    local_display_name: String,
) -> Result<SharedSyncState, String> {
    use tokio::net::TcpListener;

    let listener = TcpListener::bind("0.0.0.0:0")
        .await
        .map_err(|e| format!("Failed to bind sync server: {e}"))?;

    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get sync server address: {e}"))?
        .port();

    let state = Arc::new(SyncServerState {
        conn,
        pairing_session: Mutex::new(None),
        local_device_id,
        local_display_name,
        port,
    });

    let router = make_router(state.clone());

    tauri::async_runtime::spawn(async move {
        axum::serve(listener, router)
            .await
            .expect("Sync HTTP server error");
    });

    Ok(state)
}

/// Starts a pairing session: generates a 6-digit code, stores it with a 60-second expiry,
/// and returns the info the frontend needs to display to the user.
pub fn start_pairing(
    state: &SyncServerState,
    host: String,
) -> Result<PairingModeInfo, String> {
    use rand::Rng;

    let code: String = format!("{:06}", rand::thread_rng().gen_range(0..1_000_000u32));
    let expires_at = Utc::now() + chrono::Duration::seconds(60);

    *state
        .pairing_session
        .lock()
        .map_err(|_| "Lock poisoned".to_string())? = Some(PairingSession {
        code: code.clone(),
        expires_at,
        used: false,
    });

    Ok(PairingModeInfo {
        host,
        port: state.port,
        code,
        expires_at: expires_at.to_rfc3339(),
    })
}
