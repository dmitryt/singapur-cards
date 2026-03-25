use singapur_cards_lib::db::queries;
use singapur_cards_lib::db::schema::run_migrations;
use singapur_cards_lib::models::*;
use rusqlite::Connection;
use rusqlite::params;

fn setup_db() -> Connection {
    let conn = Connection::open_in_memory().expect("Failed to create in-memory DB");
    run_migrations(&conn).expect("Failed to run migrations");
    conn
}

fn make_dict(id: &str, name: &str, lang_from: &str, lang_to: &str) -> Dictionary {
    Dictionary {
        id: id.to_string(),
        name: name.to_string(),
        language_from: lang_from.to_string(),
        language_to: lang_to.to_string(),
        source_filename: "test.dsl".to_string(),
        source_path: None,
        import_status: "ready".to_string(),
        entry_count: 0,
        last_error: None,
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
    }
}

fn make_entry(id: &str, dict_id: &str, headword: &str, def: &str, order: i64) -> DictionaryEntry {
    DictionaryEntry {
        id: id.to_string(),
        dictionary_id: dict_id.to_string(),
        headword: headword.to_string(),
        normalized_headword: headword.to_lowercase(),
        transcription: None,
        definition_text: def.to_string(),
        example_text: None,
        audio_reference: None,
        source_order: order,
        created_at: "2026-01-01T00:00:00Z".to_string(),
    }
}

#[test]
fn test_import_and_list_dictionaries() {
    let conn = setup_db();
    let dict = make_dict("d1", "TestDict", "en", "de");
    queries::insert_dictionary(&conn, &dict).unwrap();

    let dicts = queries::fetch_all_dictionaries(&conn).unwrap();
    assert_eq!(dicts.len(), 1);
    assert_eq!(dicts[0].id, "d1");
    assert_eq!(dicts[0].name, "TestDict");
}

#[test]
fn test_delete_dictionary_cascades_entries() {
    let conn = setup_db();
    let dict = make_dict("d1", "TestDict", "en", "de");
    queries::insert_dictionary(&conn, &dict).unwrap();

    let entry = make_entry("e1", "d1", "hello", "Hallo", 0);
    queries::insert_dictionary_entry(&conn, &entry).unwrap();

    // Verify entry exists
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM dictionary_entries WHERE dictionary_id='d1'", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 1);

    // Delete dictionary
    queries::delete_dictionary(&conn, "d1").unwrap();

    // Entry should be gone (CASCADE)
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM dictionary_entries WHERE dictionary_id='d1'", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 0);
}

#[test]
fn test_search_exact_match() {
    let conn = setup_db();
    let dict = make_dict("d1", "TestDict", "en", "de");
    queries::insert_dictionary(&conn, &dict).unwrap();

    let entry = make_entry("e1", "d1", "hello", "Hallo", 0);
    queries::insert_dictionary_entry(&conn, &entry).unwrap();

    let results = queries::search_headwords(&conn, "hello", None, None, 10).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].headword, "hello");
    assert_eq!(results[0].match_kind, "exact");
}

#[test]
fn test_search_prefix_match() {
    let conn = setup_db();
    let dict = make_dict("d1", "TestDict", "en", "de");
    queries::insert_dictionary(&conn, &dict).unwrap();

    let entry = make_entry("e1", "d1", "hello", "Hallo", 0);
    let entry2 = make_entry("e2", "d1", "help", "Hilfe", 1);
    queries::insert_dictionary_entry(&conn, &entry).unwrap();
    queries::insert_dictionary_entry(&conn, &entry2).unwrap();

    let results = queries::search_headwords(&conn, "hel", None, None, 10).unwrap();
    assert!(results.len() >= 1);
    assert!(results.iter().all(|r| r.match_kind == "prefix"));
}

#[test]
fn test_get_headword_detail() {
    let conn = setup_db();
    let dict = make_dict("d1", "TestDict", "en", "de");
    queries::insert_dictionary(&conn, &dict).unwrap();

    let entry = make_entry("e1", "d1", "hello", "Hallo", 0);
    queries::insert_dictionary_entry(&conn, &entry).unwrap();

    let detail = queries::get_headword_detail(&conn, "hello", "en").unwrap();
    assert!(detail.is_some());
    let detail = detail.unwrap();
    assert_eq!(detail.headword, "hello");
    assert_eq!(detail.entries.len(), 1);
}

#[test]
fn test_grouped_search_multiple_dicts() {
    let conn = setup_db();
    let d1 = make_dict("d1", "Dict1", "en", "de");
    let d2 = make_dict("d2", "Dict2", "en", "fr");
    queries::insert_dictionary(&conn, &d1).unwrap();
    queries::insert_dictionary(&conn, &d2).unwrap();

    // Same headword in two dictionaries
    let e1 = make_entry("e1", "d1", "run", "laufen", 0);
    let e2 = make_entry("e2", "d2", "run", "courir", 0);
    queries::insert_dictionary_entry(&conn, &e1).unwrap();
    queries::insert_dictionary_entry(&conn, &e2).unwrap();

    let results = queries::search_headwords(&conn, "run", Some("en"), None, 10).unwrap();
    // Should be grouped: one result for "run" with contributing_dictionary_count=2
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].contributing_dictionary_count, 2);
}

// ── Card round-trip tests ─────────────────────────────────────────────────────

fn make_card(id: &str, headword: &str, language: &str, answer: &str) -> Card {
    Card {
        id: id.to_string(),
        language: language.to_string(),
        headword: headword.to_string(),
        answer_text: answer.to_string(),
        example_text: None,
        notes: None,
        audio_reference: None,
        source_entry_ids: vec![],
        learning_status: "unreviewed".to_string(),
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
        last_reviewed_at: None,
    }
}

#[test]
fn test_insert_and_fetch_card() {
    let conn = setup_db();
    let card = make_card("c1", "hello", "en", "Hallo");
    queries::insert_card(&conn, &card).unwrap();

    let fetched = queries::fetch_card_by_id(&conn, "c1").unwrap();
    assert!(fetched.is_some());
    let fetched = fetched.unwrap();
    assert_eq!(fetched.headword, "hello");
    assert_eq!(fetched.answer_text, "Hallo");
    assert_eq!(fetched.learning_status, "unreviewed");
}

#[test]
fn test_fetch_card_by_headword_language() {
    let conn = setup_db();
    let card = make_card("c1", "apple", "en", "Apfel");
    queries::insert_card(&conn, &card).unwrap();

    let found = queries::fetch_card_by_headword_language(&conn, "apple", "en").unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().id, "c1");

    let not_found = queries::fetch_card_by_headword_language(&conn, "apple", "fr").unwrap();
    assert!(not_found.is_none());
}

#[test]
fn test_unique_constraint_headword_language() {
    let conn = setup_db();
    let card1 = make_card("c1", "run", "en", "laufen");
    let card2 = make_card("c2", "run", "en", "courir");
    queries::insert_card(&conn, &card1).unwrap();
    // Inserting a second card with same headword+language should fail (unique index)
    let result = queries::insert_card(&conn, &card2);
    assert!(result.is_err());
}

#[test]
fn test_update_card() {
    let conn = setup_db();
    let mut card = make_card("c1", "book", "en", "Buch");
    queries::insert_card(&conn, &card).unwrap();

    card.answer_text = "Buch (updated)".to_string();
    card.updated_at = "2026-06-01T00:00:00Z".to_string();
    queries::update_card_row(&conn, &card).unwrap();

    let fetched = queries::fetch_card_by_id(&conn, "c1").unwrap().unwrap();
    assert_eq!(fetched.answer_text, "Buch (updated)");
}

#[test]
fn test_delete_card() {
    let conn = setup_db();
    let card = make_card("c1", "tree", "en", "Baum");
    queries::insert_card(&conn, &card).unwrap();

    let deleted = queries::delete_card_row(&conn, "c1").unwrap();
    assert_eq!(deleted, 1);

    let fetched = queries::fetch_card_by_id(&conn, "c1").unwrap();
    assert!(fetched.is_none());
}

#[test]
fn test_list_cards_with_learning_status_filter() {
    let conn = setup_db();
    queries::insert_card(&conn, &make_card("c1", "apple", "en", "Apfel")).unwrap();
    queries::insert_card(&conn, &make_card("c2", "book", "en", "Buch")).unwrap();

    // Mark c1 as learned
    queries::update_card_learning_status(&conn, "c1", "learned", "2026-06-01T00:00:00Z", "2026-06-01T00:00:00Z").unwrap();

    let learned = queries::fetch_all_cards(&conn, None, Some("learned")).unwrap();
    assert_eq!(learned.len(), 1);
    assert_eq!(learned[0].id, "c1");

    let unreviewed = queries::fetch_all_cards(&conn, None, Some("unreviewed")).unwrap();
    assert_eq!(unreviewed.len(), 1);
    assert_eq!(unreviewed[0].id, "c2");
}

// ── Collection round-trip tests ───────────────────────────────────────────────

fn make_collection(id: &str, name: &str) -> Collection {
    Collection {
        id: id.to_string(),
        name: name.to_string(),
        description: None,
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
    }
}

#[test]
fn test_insert_and_list_collections() {
    let conn = setup_db();
    queries::insert_collection(&conn, &make_collection("col1", "Verbs")).unwrap();
    queries::insert_collection(&conn, &make_collection("col2", "Nouns")).unwrap();

    let rows = queries::fetch_all_collections(&conn).unwrap();
    assert_eq!(rows.len(), 2);
    let names: Vec<&str> = rows.iter().map(|(c, _)| c.name.as_str()).collect();
    assert!(names.contains(&"Verbs"));
    assert!(names.contains(&"Nouns"));
}

#[test]
fn test_collection_card_count() {
    let conn = setup_db();
    queries::insert_collection(&conn, &make_collection("col1", "Verbs")).unwrap();
    queries::insert_card(&conn, &make_card("c1", "run", "en", "laufen")).unwrap();
    queries::insert_card(&conn, &make_card("c2", "walk", "en", "gehen")).unwrap();

    queries::replace_card_memberships(&conn, "c1", &["col1".to_string()], "2026-01-01T00:00:00Z").unwrap();
    queries::replace_card_memberships(&conn, "c2", &["col1".to_string()], "2026-01-01T00:00:00Z").unwrap();

    let rows = queries::fetch_all_collections(&conn).unwrap();
    let (_, count) = rows.iter().find(|(c, _)| c.id == "col1").unwrap();
    assert_eq!(*count, 2);
}

#[test]
fn test_rename_collection() {
    let conn = setup_db();
    queries::insert_collection(&conn, &make_collection("col1", "Verbs")).unwrap();
    queries::update_collection_name(&conn, "col1", "Action Verbs", "2026-06-01T00:00:00Z").unwrap();

    let rows = queries::fetch_all_collections(&conn).unwrap();
    assert_eq!(rows[0].0.name, "Action Verbs");
}

#[test]
fn test_delete_collection_preserves_cards() {
    let conn = setup_db();
    queries::insert_collection(&conn, &make_collection("col1", "Verbs")).unwrap();
    queries::insert_card(&conn, &make_card("c1", "run", "en", "laufen")).unwrap();
    queries::replace_card_memberships(&conn, "c1", &["col1".to_string()], "2026-01-01T00:00:00Z").unwrap();

    // Delete collection
    queries::delete_collection_row(&conn, "col1").unwrap();

    // Card still exists
    let card = queries::fetch_card_by_id(&conn, "c1").unwrap();
    assert!(card.is_some());

    // Membership is gone (cascade)
    let coll_ids = queries::fetch_card_collection_ids(&conn, "c1").unwrap();
    assert!(coll_ids.is_empty());
}

#[test]
fn test_collection_membership_replace() {
    let conn = setup_db();
    queries::insert_collection(&conn, &make_collection("col1", "A")).unwrap();
    queries::insert_collection(&conn, &make_collection("col2", "B")).unwrap();
    queries::insert_card(&conn, &make_card("c1", "run", "en", "laufen")).unwrap();

    queries::replace_card_memberships(&conn, "c1", &["col1".to_string(), "col2".to_string()], "2026-01-01T00:00:00Z").unwrap();
    let ids = queries::fetch_card_collection_ids(&conn, "c1").unwrap();
    assert_eq!(ids.len(), 2);

    // Replace with only col1
    queries::replace_card_memberships(&conn, "c1", &["col1".to_string()], "2026-01-01T00:00:00Z").unwrap();
    let ids2 = queries::fetch_card_collection_ids(&conn, "c1").unwrap();
    assert_eq!(ids2, vec!["col1".to_string()]);
}

#[test]
fn test_list_cards_filtered_by_collection() {
    let conn = setup_db();
    queries::insert_collection(&conn, &make_collection("col1", "Verbs")).unwrap();
    queries::insert_card(&conn, &make_card("c1", "run", "en", "laufen")).unwrap();
    queries::insert_card(&conn, &make_card("c2", "apple", "en", "Apfel")).unwrap();
    queries::replace_card_memberships(&conn, "c1", &["col1".to_string()], "2026-01-01T00:00:00Z").unwrap();

    let in_coll = queries::fetch_all_cards(&conn, Some("col1"), None).unwrap();
    assert_eq!(in_coll.len(), 1);
    assert_eq!(in_coll[0].id, "c1");
}

// ── Review round-trip tests ───────────────────────────────────────────────────

fn make_review_event(id: &str, card_id: &str, result: &str) -> ReviewEvent {
    ReviewEvent {
        id: id.to_string(),
        card_id: card_id.to_string(),
        result: result.to_string(),
        reviewed_at: "2026-06-01T00:00:00Z".to_string(),
    }
}

#[test]
fn test_record_review_result() {
    let conn = setup_db();
    queries::insert_card(&conn, &make_card("c1", "run", "en", "laufen")).unwrap();

    // Record a review
    let event = make_review_event("r1", "c1", "learned");
    queries::insert_review_event(&conn, &event).unwrap();
    queries::update_card_learning_status(&conn, "c1", "learned", "2026-06-01T00:00:00Z", "2026-06-01T00:00:00Z").unwrap();

    let card = queries::fetch_card_by_id(&conn, "c1").unwrap().unwrap();
    assert_eq!(card.learning_status, "learned");
    assert_eq!(card.last_reviewed_at, Some("2026-06-01T00:00:00Z".to_string()));
}

#[test]
fn test_start_review_session_ordering() {
    let conn = setup_db();

    // Insert cards with different statuses
    let mut unreviewed = make_card("c1", "apple", "en", "Apfel");
    unreviewed.created_at = "2026-01-01T00:00:00Z".to_string();

    let mut not_learned = make_card("c2", "book", "en", "Buch");
    not_learned.learning_status = "not_learned".to_string();
    not_learned.created_at = "2026-01-02T00:00:00Z".to_string();

    let mut learned = make_card("c3", "car", "en", "Auto");
    learned.learning_status = "learned".to_string();
    learned.created_at = "2026-01-03T00:00:00Z".to_string();

    queries::insert_card(&conn, &unreviewed).unwrap();
    queries::insert_card(&conn, &not_learned).unwrap();
    queries::insert_card(&conn, &learned).unwrap();

    let cards_for_review = queries::fetch_cards_for_review(&conn, None).unwrap();

    // Group by learning status
    let statuses: Vec<&str> = cards_for_review.iter().map(|(_, s)| s.as_str()).collect();
    let ids: Vec<&str> = cards_for_review.iter().map(|(id, _)| id.as_str()).collect();

    // All three cards should be returned
    assert_eq!(ids.len(), 3);
    // Statuses exist (ordering applied by start_review_session command, not raw query)
    assert!(statuses.contains(&"unreviewed"));
    assert!(statuses.contains(&"not_learned"));
    assert!(statuses.contains(&"learned"));
}

#[test]
fn test_review_event_stored() {
    let conn = setup_db();
    queries::insert_card(&conn, &make_card("c1", "run", "en", "laufen")).unwrap();
    queries::insert_card(&conn, &make_card("c2", "walk", "en", "gehen")).unwrap();

    queries::insert_review_event(&conn, &make_review_event("r1", "c1", "learned")).unwrap();
    queries::insert_review_event(&conn, &make_review_event("r2", "c1", "not_learned")).unwrap();
    queries::insert_review_event(&conn, &make_review_event("r3", "c2", "learned")).unwrap();

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM review_events WHERE card_id='c1'", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 2);
}

#[test]
fn test_full_mvp_round_trip() {
    let conn = setup_db();

    // 1. Import dictionary
    let dict = make_dict("d1", "TestDict", "en", "de");
    queries::insert_dictionary(&conn, &dict).unwrap();
    let entry = make_entry("e1", "d1", "hello", "Hallo", 0);
    queries::insert_dictionary_entry(&conn, &entry).unwrap();

    // 2. Search
    let results = queries::search_headwords(&conn, "hello", Some("en"), None, 10).unwrap();
    assert_eq!(results.len(), 1);

    // 3. Get headword detail
    let detail = queries::get_headword_detail(&conn, "hello", "en").unwrap().unwrap();
    assert_eq!(detail.entries.len(), 1);

    // 4. Save as card
    let card = make_card("c1", "hello", "en", "Hallo");
    queries::insert_card(&conn, &card).unwrap();

    // 5. Create collection and assign card
    queries::insert_collection(&conn, &make_collection("col1", "Greetings")).unwrap();
    queries::replace_card_memberships(&conn, "c1", &["col1".to_string()], "2026-01-01T00:00:00Z").unwrap();

    // 6. Review: start session filtered by collection
    let session_cards = queries::fetch_cards_for_review(&conn, Some("col1")).unwrap();
    assert_eq!(session_cards.len(), 1);

    // 7. Record result
    queries::insert_review_event(&conn, &make_review_event("r1", "c1", "learned")).unwrap();
    queries::update_card_learning_status(&conn, "c1", "learned", "2026-06-01T00:00:00Z", "2026-06-01T00:00:00Z").unwrap();

    let updated = queries::fetch_card_by_id(&conn, "c1").unwrap().unwrap();
    assert_eq!(updated.learning_status, "learned");
}
