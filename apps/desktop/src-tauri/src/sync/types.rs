use serde::{Deserialize, Serialize};

pub const PROTOCOL_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncChange {
    pub id: String,
    #[serde(rename = "deviceId")]
    pub device_id: String,
    #[serde(rename = "tableName")]
    pub table_name: String,
    #[serde(rename = "rowId")]
    pub row_id: String,
    #[serde(rename = "opType")]
    pub op_type: String,
    #[serde(rename = "logicalClock")]
    pub logical_clock: i64,
    #[serde(rename = "payloadJson")]
    pub payload_json: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncTombstone {
    pub id: String,
    #[serde(rename = "deviceId")]
    pub device_id: String,
    #[serde(rename = "tableName")]
    pub table_name: String,
    #[serde(rename = "rowId")]
    pub row_id: String,
    #[serde(rename = "logicalClock")]
    pub logical_clock: i64,
    #[serde(rename = "deletedAt")]
    pub deleted_at: String,
}

#[derive(Debug, Deserialize)]
pub struct PairingCompleteRequest {
    #[serde(rename = "mobileDeviceId")]
    pub mobile_device_id: String,
    #[serde(rename = "pairingToken")]
    pub pairing_token: String,
    #[serde(rename = "mobileDisplayName")]
    pub mobile_display_name: String,
    #[serde(rename = "protocolVersion")]
    pub protocol_version: u32,
}

#[derive(Debug, Serialize)]
pub struct PairingCompleteResponse {
    #[serde(rename = "desktopDeviceId")]
    pub desktop_device_id: String,
    #[serde(rename = "desktopDisplayName")]
    pub desktop_display_name: String,
    #[serde(rename = "syncCredential")]
    pub sync_credential: String,
}

#[derive(Debug, Deserialize)]
pub struct PairingForgetRequest {
    #[serde(rename = "mobileDeviceId")]
    pub mobile_device_id: String,
    #[serde(rename = "authToken")]
    pub auth_token: String,
    #[serde(rename = "protocolVersion")]
    pub protocol_version: u32,
}

#[derive(Debug, Serialize)]
pub struct PairingForgetResponse {
    pub ok: bool,
}

#[derive(Debug, Deserialize)]
pub struct PullPushRequest {
    #[serde(rename = "mobileDeviceId")]
    pub mobile_device_id: String,
    #[serde(rename = "desktopDeviceId")]
    pub desktop_device_id: String,
    #[serde(rename = "authToken")]
    pub auth_token: String,
    #[serde(rename = "requestId")]
    pub request_id: String,
    #[serde(rename = "requestTimestamp")]
    pub request_timestamp: String,
    #[serde(rename = "knownRemoteCursor")]
    pub known_remote_cursor: i64,
    #[serde(rename = "knownAckedLocalCursor")]
    pub known_acked_local_cursor: i64,
    pub changes: Vec<SyncChange>,
    pub tombstones: Vec<SyncTombstone>,
    #[serde(rename = "protocolVersion")]
    pub protocol_version: u32,
}

#[derive(Debug, Serialize)]
pub struct ConflictSummary {
    pub table: String,
    #[serde(rename = "rowId")]
    pub row_id: String,
    pub resolution: String,
}

#[derive(Debug, Serialize)]
pub struct PullPushResponse {
    #[serde(rename = "acceptedLocalCursor")]
    pub accepted_local_cursor: i64,
    #[serde(rename = "remoteCursor")]
    pub remote_cursor: i64,
    #[serde(rename = "requestId")]
    pub request_id: String,
    pub changes: Vec<SyncChange>,
    pub tombstones: Vec<SyncTombstone>,
    #[serde(rename = "serverTime")]
    pub server_time: String,
    #[serde(rename = "conflictsSummary")]
    pub conflicts_summary: Vec<ConflictSummary>,
}

/// Returned to the Tauri frontend when pairing mode is started.
#[derive(Debug, Serialize, Clone)]
pub struct PairingModeInfo {
    pub host: String,
    pub port: u16,
    pub code: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
}
