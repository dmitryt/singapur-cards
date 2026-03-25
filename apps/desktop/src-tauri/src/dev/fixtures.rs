/// Deterministic seed data builders for integration tests and development seeding.
///
/// All builders accept an explicit index/seed so tests are reproducible.
use crate::models::{Card, Collection, Dictionary, DictionaryEntry, ReviewEvent};

pub fn make_dictionary(idx: usize, lang_from: &str, lang_to: &str) -> Dictionary {
    Dictionary {
        id: format!("dev-dict-{idx}"),
        name: format!("Dev Dictionary {idx} ({lang_from}→{lang_to})"),
        language_from: lang_from.to_string(),
        language_to: lang_to.to_string(),
        source_filename: format!("dev_{idx}.dsl"),
        source_path: None,
        import_status: "ready".to_string(),
        entry_count: 0,
        last_error: None,
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
    }
}

pub fn make_dictionary_entry(
    idx: usize,
    dict_id: &str,
    headword: &str,
    definition: &str,
) -> DictionaryEntry {
    DictionaryEntry {
        id: format!("dev-entry-{idx}"),
        dictionary_id: dict_id.to_string(),
        headword: headword.to_string(),
        normalized_headword: headword.to_lowercase(),
        transcription: None,
        definition_text: definition.to_string(),
        example_text: None,
        audio_reference: None,
        source_order: idx as i64,
        created_at: "2026-01-01T00:00:00Z".to_string(),
    }
}

pub fn make_card(idx: usize, headword: &str, language: &str, answer: &str) -> Card {
    let statuses = ["unreviewed", "not_learned", "learned"];
    Card {
        id: format!("dev-card-{idx}"),
        language: language.to_string(),
        headword: headword.to_string(),
        answer_text: answer.to_string(),
        example_text: Some(format!("Example usage of '{headword}'")),
        notes: None,
        audio_reference: None,
        source_entry_ids: vec![format!("dev-entry-{idx}")],
        learning_status: statuses[idx % statuses.len()].to_string(),
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
        last_reviewed_at: if idx % 3 == 2 {
            Some("2026-03-01T00:00:00Z".to_string())
        } else {
            None
        },
    }
}

pub fn make_collection(idx: usize, name: &str) -> Collection {
    Collection {
        id: format!("dev-coll-{idx}"),
        name: name.to_string(),
        description: Some(format!("Dev collection: {name}")),
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
    }
}

pub fn make_review_event(idx: usize, card_id: &str) -> ReviewEvent {
    let results = ["learned", "not_learned"];
    ReviewEvent {
        id: format!("dev-review-{idx}"),
        card_id: card_id.to_string(),
        result: results[idx % results.len()].to_string(),
        reviewed_at: "2026-03-01T00:00:00Z".to_string(),
    }
}
