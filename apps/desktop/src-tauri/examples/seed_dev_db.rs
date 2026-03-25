//! Development fixture seeder for Singapur Cards.
//!
//! Populates a local SQLite database with realistic dictionaries, cards, collections,
//! memberships, and review events for local development and smoke testing.
//!
//! Usage:
//!   cargo run --example seed_dev_db --manifest-path src-tauri/Cargo.toml
//!   cargo run --example seed_dev_db --manifest-path src-tauri/Cargo.toml -- --seed 42
//!   cargo run --example seed_dev_db --manifest-path src-tauri/Cargo.toml -- --db /tmp/dev.db

use fake::faker::lorem::en::{Sentence, Word};
use fake::Fake;
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use rusqlite::Connection;
use singapur_cards_lib::db::queries;
use singapur_cards_lib::db::schema::run_migrations;
use singapur_cards_lib::models::*;
use std::env;
use std::path::PathBuf;

const CARD_COUNT: usize = 30;
const COLLECTION_COUNT: usize = 4;

fn parse_args() -> (u64, PathBuf) {
    let args: Vec<String> = env::args().collect();
    let mut seed: u64 = 12345;
    let mut db_path = PathBuf::from("/tmp/singapur_cards_dev.db");

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--seed" => {
                i += 1;
                seed = args.get(i).and_then(|s| s.parse().ok()).unwrap_or(seed);
            }
            "--db" => {
                i += 1;
                if let Some(p) = args.get(i) {
                    db_path = PathBuf::from(p);
                }
            }
            _ => {}
        }
        i += 1;
    }
    (seed, db_path)
}

fn main() -> rusqlite::Result<()> {
    let (seed, db_path) = parse_args();
    println!("Seeding database at: {} (seed={})", db_path.display(), seed);

    if db_path.exists() {
        std::fs::remove_file(&db_path).ok();
    }

    let conn = Connection::open(&db_path)?;
    run_migrations(&conn).expect("Failed to run migrations");

    let mut rng = StdRng::seed_from_u64(seed);

    // ── Dictionaries ──────────────────────────────────────────────────────────
    let lang_pairs = [("en", "de"), ("en", "es"), ("de", "en")];
    let mut all_entry_ids: Vec<(String, String)> = vec![]; // (entry_id, language_from)

    for (dict_idx, (lang_from, lang_to)) in lang_pairs.iter().enumerate() {
        let dict_id = format!("dict-{dict_idx}");
        let dict = Dictionary {
            id: dict_id.clone(),
            name: format!("{} → {} Dictionary", lang_from.to_uppercase(), lang_to.to_uppercase()),
            language_from: lang_from.to_string(),
            language_to: lang_to.to_string(),
            source_filename: format!("{lang_from}_{lang_to}.dsl"),
            source_path: None,
            import_status: "ready".to_string(),
            entry_count: 0,
            last_error: None,
            created_at: "2026-01-01T00:00:00Z".to_string(),
            updated_at: "2026-01-01T00:00:00Z".to_string(),
        };
        queries::insert_dictionary(&conn, &dict)?;

        let entry_count = 20usize;
        for j in 0..entry_count {
            let headword: String = Word().fake_with_rng(&mut rng);
            let definition: String = Sentence(3..8).fake_with_rng(&mut rng);
            let example: String = Sentence(5..12).fake_with_rng(&mut rng);
            let entry_id = format!("entry-{dict_idx}-{j}");

            let entry = DictionaryEntry {
                id: entry_id.clone(),
                dictionary_id: dict_id.clone(),
                headword: headword.clone(),
                normalized_headword: headword.to_lowercase(),
                transcription: None,
                definition_text: definition,
                example_text: Some(example),
                audio_reference: None,
                source_order: j as i64,
                created_at: "2026-01-01T00:00:00Z".to_string(),
            };
            queries::insert_dictionary_entry(&conn, &entry)?;
            all_entry_ids.push((entry_id, lang_from.to_string()));
        }

        conn.execute(
            "UPDATE dictionaries SET entry_count=? WHERE id=?",
            rusqlite::params![entry_count as i64, dict_id],
        )?;
    }

    // ── Collections ───────────────────────────────────────────────────────────
    let collection_names = ["Core Vocabulary", "Verbs", "Nouns", "Daily Use"];
    let collection_ids: Vec<String> = collection_names[..COLLECTION_COUNT]
        .iter()
        .enumerate()
        .map(|(i, name)| {
            let coll = Collection {
                id: format!("coll-{i}"),
                name: name.to_string(),
                description: Some(format!("A curated set of {}", name.to_lowercase())),
                created_at: "2026-01-01T00:00:00Z".to_string(),
                updated_at: "2026-01-01T00:00:00Z".to_string(),
            };
            queries::insert_collection(&conn, &coll).expect("insert collection");
            coll.id
        })
        .collect();

    // ── Cards ─────────────────────────────────────────────────────────────────
    let statuses = ["unreviewed", "not_learned", "learned"];
    let mut card_ids: Vec<String> = vec![];

    for i in 0..CARD_COUNT {
        let headword: String = Word().fake_with_rng(&mut rng);
        let answer: String = Sentence(2..6).fake_with_rng(&mut rng);
        let example: String = Sentence(5..12).fake_with_rng(&mut rng);
        let status = statuses[i % statuses.len()];
        let card_id = format!("card-{i}");
        let lang = if i % 3 == 2 { "de" } else { "en" };

        let card = Card {
            id: card_id.clone(),
            language: lang.to_string(),
            headword,
            answer_text: answer,
            example_text: Some(example),
            notes: None,
            audio_reference: None,
            source_entry_ids: if i < all_entry_ids.len() {
                vec![all_entry_ids[i].0.clone()]
            } else {
                vec![]
            },
            learning_status: status.to_string(),
            created_at: format!("2026-01-{:02}T00:00:00Z", (i % 28) + 1),
            updated_at: format!("2026-01-{:02}T00:00:00Z", (i % 28) + 1),
            last_reviewed_at: if status != "unreviewed" {
                Some("2026-03-01T00:00:00Z".to_string())
            } else {
                None
            },
        };

        if let Err(e) = queries::insert_card(&conn, &card) {
            eprintln!("  Skipping card-{i} ({}): {e}", card.headword);
            continue;
        }
        card_ids.push(card_id);
    }

    // ── Memberships ───────────────────────────────────────────────────────────
    for (i, card_id) in card_ids.iter().enumerate() {
        let num_colls: usize = rng.gen_range(0..=2);
        if num_colls == 0 {
            continue;
        }
        let chosen: Vec<String> = {
            let mut idxs: Vec<usize> = (0..collection_ids.len()).collect();
            idxs.sort_by_key(|_| rng.gen::<u64>());
            idxs[..num_colls.min(collection_ids.len())]
                .iter()
                .map(|&idx| collection_ids[idx].clone())
                .collect()
        };
        queries::replace_card_memberships(&conn, card_id, &chosen, "2026-01-01T00:00:00Z")
            .expect("insert memberships");
        let _ = i; // suppress warning
    }

    // ── Review events ─────────────────────────────────────────────────────────
    let review_results = ["learned", "not_learned"];
    let mut event_idx = 0usize;
    for card_id in card_ids.iter().filter(|_| rng.gen_bool(0.6)) {
        let result = review_results[event_idx % review_results.len()];
        let event = ReviewEvent {
            id: format!("review-{event_idx}"),
            card_id: card_id.clone(),
            result: result.to_string(),
            reviewed_at: "2026-03-01T00:00:00Z".to_string(),
        };
        queries::insert_review_event(&conn, &event).expect("insert review event");
        event_idx += 1;
    }

    println!("✓ Seeded {} dictionaries ({} entries each)", lang_pairs.len(), 20);
    println!("✓ Seeded {} collections", COLLECTION_COUNT);
    println!("✓ Seeded {} cards", card_ids.len());
    println!("✓ Seeded {} review events", event_idx);
    println!("\nDatabase ready at: {}", db_path.display());
    println!("Run with --seed <N> to reproduce this exact dataset.");

    Ok(())
}
