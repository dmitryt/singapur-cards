use tauri::command;
use uuid::Uuid;
use chrono::Utc;
use rand::seq::SliceRandom;
use rand::thread_rng;

use crate::db::queries;
use crate::models::*;
use crate::state::AppState;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartReviewSessionInput {
    pub collection_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordReviewResultInput {
    pub card_id: String,
    pub result: String,
}

#[command]
pub async fn start_review_session(
    input: StartReviewSessionInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    let cards = match queries::fetch_cards_for_review(&conn, input.collection_id.as_deref()) {
        Ok(c) => c,
        Err(e) => return Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
    };

    // Group cards by learning status
    let mut unreviewed: Vec<String> = Vec::new();
    let mut not_learned: Vec<String> = Vec::new();
    let mut learned: Vec<String> = Vec::new();

    for (id, status) in &cards {
        match status.as_str() {
            "unreviewed" => unreviewed.push(id.clone()),
            "not_learned" => not_learned.push(id.clone()),
            "learned" => learned.push(id.clone()),
            _ => unreviewed.push(id.clone()),
        }
    }

    // Randomize within each group
    let mut rng = thread_rng();
    unreviewed.shuffle(&mut rng);
    not_learned.shuffle(&mut rng);
    learned.shuffle(&mut rng);

    // Combine: unreviewed first, then not_learned, then learned
    let mut session_card_ids = unreviewed;
    session_card_ids.extend(not_learned);
    session_card_ids.extend(learned);

    let total = session_card_ids.len();

    Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
        "sessionCardIds": session_card_ids,
        "totalCards": total,
    }))).unwrap())
}

#[command]
pub async fn record_review_result(
    input: RecordReviewResultInput,
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    if input.result != "learned" && input.result != "not_learned" {
        return Ok(serde_json::to_value(CommandFailure::invalid_input(
            "result must be 'learned' or 'not_learned'"
        )).unwrap());
    }

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    // Verify card exists
    match queries::fetch_card_by_id(&conn, &input.card_id) {
        Ok(None) => return Ok(serde_json::to_value(CommandFailure::not_found("Card not found")).unwrap()),
        Err(e) => return Ok(serde_json::to_value(CommandFailure::unexpected_error(e.to_string())).unwrap()),
        Ok(Some(_)) => {}
    }

    let now = Utc::now().to_rfc3339();
    let event = ReviewEvent {
        id: Uuid::new_v4().to_string(),
        card_id: input.card_id.clone(),
        result: input.result.clone(),
        reviewed_at: now.clone(),
    };

    if let Err(e) = queries::insert_review_event(&conn, &event) {
        return Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap());
    }

    if let Err(e) = queries::update_card_learning_status(&conn, &input.card_id, &input.result, &now, &now) {
        return Ok(serde_json::to_value(CommandFailure::persistence_failed(e.to_string())).unwrap());
    }

    Ok(serde_json::to_value(CommandSuccess::new(serde_json::json!({
        "cardId": input.card_id,
        "learningStatus": input.result,
        "reviewedAt": now,
    }))).unwrap())
}
