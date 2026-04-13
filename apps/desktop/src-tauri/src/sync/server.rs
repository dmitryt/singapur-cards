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
    ConflictSummary, PairingCompleteRequest, PairingCompleteResponse, PairingForgetRequest,
    PairingForgetResponse, PairingModeInfo,
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

struct SyncError {
    status: StatusCode,
    code: &'static str,
    message: String,
}

impl IntoResponse for SyncError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(serde_json::json!({
                "code": self.code,
                "message": self.message
            })),
        )
            .into_response()
    }
}

impl From<rusqlite::Error> for SyncError {
    fn from(e: rusqlite::Error) -> Self {
        SyncError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            code: "INTERNAL_ERROR",
            message: e.to_string(),
        }
    }
}

type SyncResult<T> = std::result::Result<T, SyncError>;

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

pub fn make_router(state: SharedSyncState) -> Router {
    Router::new()
        .route("/pairing/complete", post(handle_pairing_complete))
        .route("/pairing/forget", post(handle_pairing_forget))
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
        return Err(SyncError {
            status: StatusCode::BAD_REQUEST,
            code: "PROTOCOL_MISMATCH",
            message: format!(
                "Protocol version mismatch: expected {}, got {}",
                PROTOCOL_VERSION, req.protocol_version
            ),
        });
    }

    // Validate pairing session
    {
        let mut session_guard = state
            .pairing_session
            .lock()
            .map_err(|_| SyncError {
                status: StatusCode::INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
                message: "Lock poisoned".into(),
            })?;

        let session = session_guard.as_mut().ok_or_else(|| SyncError {
            status: StatusCode::CONFLICT,
            code: "NO_ACTIVE_PAIRING",
            message: "No active pairing session".into(),
        })?;

        if session.used {
            return Err(SyncError {
                status: StatusCode::CONFLICT,
                code: "PAIRING_TOKEN_USED",
                message: "Pairing token already used".into(),
            });
        }
        if Utc::now() > session.expires_at {
            return Err(SyncError {
                status: StatusCode::GONE,
                code: "PAIRING_TOKEN_EXPIRED",
                message: "Pairing token expired".into(),
            });
        }
        if session.code != req.pairing_token {
            return Err(SyncError {
                status: StatusCode::UNAUTHORIZED,
                code: "INVALID_PAIRING_TOKEN",
                message: "Invalid pairing token".into(),
            });
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
            .map_err(|_| SyncError {
                status: StatusCode::INTERNAL_SERVER_ERROR,
                code: "INTERNAL_ERROR",
                message: "DB lock poisoned".into(),
            })?;

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

async fn handle_pairing_forget(
    State(state): State<SharedSyncState>,
    Json(req): Json<PairingForgetRequest>,
) -> SyncResult<Json<PairingForgetResponse>> {
    if req.protocol_version != PROTOCOL_VERSION {
        return Err(SyncError {
            status: StatusCode::BAD_REQUEST,
            code: "PROTOCOL_MISMATCH",
            message: format!(
                "Protocol version mismatch: expected {}, got {}",
                PROTOCOL_VERSION, req.protocol_version
            ),
        });
    }

    let conn = state.conn.lock().map_err(|_| SyncError {
        status: StatusCode::INTERNAL_SERVER_ERROR,
        code: "INTERNAL_ERROR",
        message: "DB lock poisoned".into(),
    })?;

    let stored_credential: Option<String> = conn
        .query_row(
            "SELECT credential FROM sync_devices WHERE id = ?1 AND is_local = 0",
            rusqlite::params![req.mobile_device_id],
            |row| row.get(0),
        )
        .optional()?;

    let Some(stored_credential) = stored_credential else {
        return Err(SyncError {
            status: StatusCode::UNAUTHORIZED,
            code: "PAIRING_REVOKED",
            message: "Unknown mobile device".into(),
        });
    };

    if stored_credential != req.auth_token {
        return Err(SyncError {
            status: StatusCode::UNAUTHORIZED,
            code: "PAIRING_REVOKED",
            message: "Invalid auth token".into(),
        });
    }

    conn.execute(
        "DELETE FROM sync_cursors WHERE peer_device_id = ?1",
        rusqlite::params![req.mobile_device_id],
    )?;
    conn.execute(
        "DELETE FROM sync_devices WHERE id = ?1 AND is_local = 0",
        rusqlite::params![req.mobile_device_id],
    )?;

    Ok(Json(PairingForgetResponse { ok: true }))
}

// ---------------------------------------------------------------------------
// Pull-push sync handler
// ---------------------------------------------------------------------------

async fn handle_pull_push(
    State(state): State<SharedSyncState>,
    Json(req): Json<PullPushRequest>,
) -> SyncResult<Json<PullPushResponse>> {
    if req.protocol_version != PROTOCOL_VERSION {
        return Err(SyncError {
            status: StatusCode::BAD_REQUEST,
            code: "PROTOCOL_MISMATCH",
            message: format!(
                "Protocol version mismatch: expected {}, got {}",
                PROTOCOL_VERSION, req.protocol_version
            ),
        });
    }

    let conn = state
        .conn
        .lock()
        .map_err(|_| SyncError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            code: "INTERNAL_ERROR",
            message: "DB lock poisoned".into(),
        })?;

    // Authenticate
    let stored_credential: Option<String> = conn
        .query_row(
            "SELECT credential FROM sync_devices WHERE id = ?1 AND is_local = 0",
            rusqlite::params![req.mobile_device_id],
            |row| row.get(0),
        )
        .optional()?;

    let stored_credential = stored_credential.ok_or_else(|| SyncError {
        status: StatusCode::UNAUTHORIZED,
        code: "PAIRING_REVOKED",
        message: "Unknown mobile device".into(),
    })?;

    if stored_credential != req.auth_token {
        return Err(SyncError {
            status: StatusCode::UNAUTHORIZED,
            code: "PAIRING_REVOKED",
            message: "Invalid auth token".into(),
        });
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
        .map_err(|e| SyncError {
            status: StatusCode::BAD_REQUEST,
            code: "INVALID_PAYLOAD",
            message: format!("Invalid payload JSON: {e}"),
        })?;

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
        .ok_or_else(|| SyncError {
            status: StatusCode::BAD_REQUEST,
            code: "INVALID_PAYLOAD",
            message: "Payload is not an object".into(),
        })?;

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
///
/// Binds using a std listener (no async runtime required), then runs axum on a
/// dedicated OS thread with its own tokio runtime to avoid IO-driver association
/// issues with Tauri's runtime.
pub fn start_sync_server(
    conn: Arc<Mutex<Connection>>,
    local_device_id: String,
    local_display_name: String,
) -> Result<SharedSyncState, String> {
    let std_listener = std::net::TcpListener::bind("0.0.0.0:0")
        .map_err(|e| format!("Failed to bind sync server: {e}"))?;
    std_listener
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to set sync server non-blocking: {e}"))?;

    let port = std_listener
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

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_multi_thread()
            .worker_threads(2)
            .enable_all()
            .build()
            .expect("Failed to build sync server runtime");

        rt.block_on(async move {
            let listener = tokio::net::TcpListener::from_std(std_listener)
                .expect("Failed to convert sync server listener");
            axum::serve(listener, router)
                .await
                .expect("Sync HTTP server error");
        });
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
    let expires_at = Utc::now() + chrono::Duration::seconds(120);

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
        display_name: state.local_display_name.clone(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::run_migrations;
    use reqwest::StatusCode as HttpStatusCode;
    use std::sync::{Arc, Mutex};

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn pull_push_returns_pairing_revoked_after_device_is_removed() {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        run_migrations(&conn).expect("run migrations");
        let conn = Arc::new(Mutex::new(conn));

        let local_device_id = "desktop-1".to_string();
        let mobile_device_id = "mobile-1".to_string();
        let credential = "cred-1".to_string();
        let now = Utc::now().to_rfc3339();

        {
            let db = conn.lock().expect("lock db");
            db.execute(
                "INSERT INTO sync_devices (id, display_name, is_local, created_at) VALUES (?1, ?2, 1, ?3)",
                rusqlite::params![local_device_id, "Desktop", now],
            )
            .expect("insert local device");
            db.execute(
                "INSERT INTO sync_devices (id, display_name, is_local, credential, paired_at, created_at) VALUES (?1, ?2, 0, ?3, ?4, ?4)",
                rusqlite::params![mobile_device_id, "Mobile", credential, now],
            )
            .expect("insert mobile device");
            db.execute(
                "DELETE FROM sync_devices WHERE id = ?1 AND is_local = 0",
                rusqlite::params![mobile_device_id],
            )
            .expect("forget device");
        }

        let state = start_sync_server(conn, local_device_id.clone(), "Desktop".to_string())
            .expect("start sync server");
        let url = format!("http://127.0.0.1:{}/sync/pull-push", state.port);

        let payload = serde_json::json!({
            "mobileDeviceId": mobile_device_id,
            "desktopDeviceId": local_device_id,
            "authToken": credential,
            "requestId": "req-1",
            "requestTimestamp": Utc::now().to_rfc3339(),
            "knownRemoteCursor": 0,
            "knownAckedLocalCursor": 0,
            "changes": [],
            "tombstones": [],
            "protocolVersion": PROTOCOL_VERSION
        });

        let client = reqwest::Client::new();
        let mut last_err: Option<String> = None;
        for _ in 0..10 {
            match client.post(&url).json(&payload).send().await {
                Ok(response) => {
                    assert_eq!(response.status(), HttpStatusCode::UNAUTHORIZED);
                    let body: serde_json::Value = response.json().await.expect("json body");
                    assert_eq!(body.get("code").and_then(|v| v.as_str()), Some("PAIRING_REVOKED"));
                    assert_eq!(
                        body.get("message").and_then(|v| v.as_str()),
                        Some("Unknown mobile device")
                    );
                    return;
                }
                Err(e) => {
                    last_err = Some(e.to_string());
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
            }
        }

        panic!(
            "sync server did not respond in time: {}",
            last_err.unwrap_or_else(|| "unknown error".to_string())
        );
    }
}
