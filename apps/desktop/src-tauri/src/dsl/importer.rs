use std::fs;
use tauri::ipc::Channel;
use crate::models::ImportProgressEvent;
use super::parser::{parse_dsl, ParsedEntry};

pub struct ImportResult {
    pub entries: Vec<ParsedEntry>,
    pub entry_count: u64,
    pub skipped_entry_count: u64,
    pub warnings: Option<String>,
}

fn decode_utf16_bytes(bytes: &[u8], little_endian: bool) -> Result<String, String> {
    if !bytes.len().is_multiple_of(2) {
        return Err("UTF-16 byte length is not even".to_string());
    }
    let units: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|chunk| {
            if little_endian {
                u16::from_le_bytes([chunk[0], chunk[1]])
            } else {
                u16::from_be_bytes([chunk[0], chunk[1]])
            }
        })
        .collect();
    String::from_utf16(&units).map_err(|e| format!("invalid UTF-16 data: {e}"))
}

pub fn import_dsl_file(
    file_path: &str,
    on_progress: &Channel<ImportProgressEvent>,
) -> Result<ImportResult, String> {
    // Emit scanning phase
    let _ = on_progress.send(ImportProgressEvent {
        processed_entries: 0,
        total_estimate: None,
        phase: "scanning".to_string(),
    });
    let bytes = fs::read(file_path)
        .map_err(|e| format!("Failed to read file bytes: {e}"))?;
    let utf16le_bom = bytes.starts_with(&[0xFF, 0xFE]);
    let utf16be_bom = bytes.starts_with(&[0xFE, 0xFF]);
    let utf8_bom = bytes.starts_with(&[0xEF, 0xBB, 0xBF]);
    let content = if utf16le_bom {
        decode_utf16_bytes(&bytes[2..], true)
            .map_err(|e| format!("Failed to read file: {e}"))?
    } else if utf16be_bom {
        decode_utf16_bytes(&bytes[2..], false)
            .map_err(|e| format!("Failed to read file: {e}"))?
    } else if utf8_bom {
        String::from_utf8(bytes[3..].to_vec())
            .map_err(|e| format!("Failed to read file: {e}"))?
    } else {
        String::from_utf8(bytes)
            .map_err(|e| format!("Failed to read file: {e}"))?
    };

    // Emit indexing phase
    let _ = on_progress.send(ImportProgressEvent {
        processed_entries: 0,
        total_estimate: None,
        phase: "indexing".to_string(),
    });

    let (entries, skipped) = parse_dsl(&content);
    let total = entries.len() as u64;

    // Emit progress during parse (batch updates every 500)
    let mut processed: u64 = 0;
    for chunk_start in (0..total).step_by(500) {
        let chunk_end = (chunk_start + 500).min(total);
        processed = chunk_end;
        let _ = on_progress.send(ImportProgressEvent {
            processed_entries: processed,
            total_estimate: Some(total),
            phase: "indexing".to_string(),
        });
    }

    // Finalizing phase
    let _ = on_progress.send(ImportProgressEvent {
        processed_entries: total,
        total_estimate: Some(total),
        phase: "finalizing".to_string(),
    });

    let warnings = if skipped > 0 {
        Some(format!("{skipped} entries were skipped due to missing or malformed content."))
    } else {
        None
    };

    Ok(ImportResult {
        entries,
        entry_count: total,
        skipped_entry_count: skipped,
        warnings,
    })
}
