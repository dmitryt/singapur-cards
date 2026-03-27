use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Dictionary {
    pub id: String,
    pub name: String,
    pub language_from: String,
    pub language_to: String,
    pub source_filename: String,
    pub source_path: Option<String>,
    pub import_status: String,
    pub entry_count: i64,
    pub last_error: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DictionaryEntry {
    pub id: String,
    pub dictionary_id: String,
    pub headword: String,
    pub normalized_headword: String,
    pub transcription: Option<String>,
    pub definition_text: String,
    pub example_text: Option<String>,
    pub audio_reference: Option<String>,
    pub source_order: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeadwordDetailEntry {
    pub entry_id: String,
    pub dictionary_id: String,
    pub language_to: String,
    pub dictionary_name: String,
    pub transcription: Option<String>,
    pub definition_text: String,
    pub example_text: Option<String>,
    pub audio_reference: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeadwordDetail {
    pub headword: String,
    pub language: String,
    pub normalized_headword: String,
    pub source_entry_ids: Vec<String>,
    pub entries: Vec<HeadwordDetailEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub language: String,
    pub headword: String,
    pub answer_text: String,
    pub example_text: Option<String>,
    pub notes: Option<String>,
    pub audio_reference: Option<String>,
    pub source_entry_ids: Vec<String>,
    pub learning_status: String,
    pub created_at: String,
    pub updated_at: String,
    pub last_reviewed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewEvent {
    pub id: String,
    pub card_id: String,
    pub result: String,
    pub reviewed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandSuccess<T: Serialize> {
    pub ok: bool,
    pub data: T,
}

impl<T: Serialize> CommandSuccess<T> {
    pub fn new(data: T) -> Self {
        CommandSuccess { ok: true, data }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandFailure {
    pub ok: bool,
    pub code: String,
    pub message: String,
}

impl CommandFailure {
    pub fn new(code: &str, message: impl Into<String>) -> Self {
        CommandFailure {
            ok: false,
            code: code.to_string(),
            message: message.into(),
        }
    }
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new("NOT_FOUND", message)
    }
    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::new("INVALID_INPUT", message)
    }
    pub fn persistence_failed(message: impl Into<String>) -> Self {
        Self::new("PERSISTENCE_FAILED", message)
    }
    pub fn unexpected_error(message: impl Into<String>) -> Self {
        Self::new("UNEXPECTED_ERROR", message)
    }
    pub fn parse_failed(message: impl Into<String>) -> Self {
        Self::new("PARSE_FAILED", message)
    }
    pub fn file_read_failed(message: impl Into<String>) -> Self {
        Self::new("FILE_READ_FAILED", message)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictFailure {
    pub ok: bool,
    pub code: String,
    pub message: String,
    pub existing_card_id: String,
}

impl ConflictFailure {
    pub fn new(message: impl Into<String>, existing_card_id: String) -> Self {
        ConflictFailure {
            ok: false,
            code: "CONFLICT".to_string(),
            message: message.into(),
            existing_card_id,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Language {
    pub code: String,
    pub title: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLanguageInput {
    pub code: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLanguageInput {
    pub code: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportProgressEvent {
    pub processed_entries: u64,
    pub total_estimate: Option<u64>,
    pub phase: String,
}
