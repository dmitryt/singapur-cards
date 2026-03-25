//! Search performance benchmark for Singapur Cards (T070).
//!
//! Seeds a SQLite database with ~200,000 entries then measures p50/p95/p99
//! latency for `search_headwords`. Pass/fail gate: p95 < 1000 ms.
//!
//! Usage:
//!   cargo run --example bench_search --release --manifest-path src-tauri/Cargo.toml
//!   cargo run --example bench_search --release --manifest-path src-tauri/Cargo.toml -- --entries 200000

use rusqlite::Connection;
use singapur_cards_lib::db::queries;
use singapur_cards_lib::db::schema::run_migrations;
use singapur_cards_lib::models::{Dictionary, DictionaryEntry};
use std::env;
use std::time::{Duration, Instant};

const DEFAULT_ENTRY_COUNT: usize = 200_000;
const SEARCH_ITERATIONS: usize = 100;
const P95_LIMIT_MS: u128 = 1000;

fn parse_args() -> usize {
    let args: Vec<String> = env::args().collect();
    let mut count = DEFAULT_ENTRY_COUNT;
    let mut i = 1;
    while i < args.len() {
        if args[i] == "--entries" {
            i += 1;
            count = args.get(i).and_then(|s| s.parse().ok()).unwrap_or(count);
        }
        i += 1;
    }
    count
}

fn seed_entries(conn: &Connection, entry_count: usize) {
    let dict = Dictionary {
        id: "bench-dict".to_string(),
        name: "Benchmark Dictionary".to_string(),
        language_from: "en".to_string(),
        language_to: "de".to_string(),
        source_filename: "bench.dsl".to_string(),
        source_path: None,
        import_status: "ready".to_string(),
        entry_count: entry_count as i64,
        last_error: None,
        created_at: "2026-01-01T00:00:00Z".to_string(),
        updated_at: "2026-01-01T00:00:00Z".to_string(),
    };
    queries::insert_dictionary(conn, &dict).expect("insert dict");

    // Use word-list derived from alphabet combinations for realistic headwords
    let prefixes = ["app", "book", "car", "door", "ear", "fish", "gate", "hand", "ice",
                    "joy", "key", "lamp", "man", "note", "oak", "pen", "queen", "run",
                    "sun", "tree", "use", "van", "web", "x", "yard", "zone"];

    println!("Seeding {} entries (batched transactions)...", entry_count);
    let batch_size = 10_000;
    let mut inserted = 0usize;

    while inserted < entry_count {
        let end = (inserted + batch_size).min(entry_count);
        conn.execute("BEGIN", []).unwrap();
        for i in inserted..end {
            let prefix = prefixes[i % prefixes.len()];
            let headword = format!("{prefix}{i}");
            let entry = DictionaryEntry {
                id: format!("be-{i}"),
                dictionary_id: "bench-dict".to_string(),
                headword: headword.clone(),
                normalized_headword: headword.to_lowercase(),
                transcription: None,
                definition_text: format!("Definition for {headword}"),
                example_text: None,
                audio_reference: None,
                source_order: i as i64,
                created_at: "2026-01-01T00:00:00Z".to_string(),
            };
            queries::insert_dictionary_entry(conn, &entry).expect("insert entry");
        }
        conn.execute("COMMIT", []).unwrap();
        inserted = end;
        print!("\r  {inserted}/{entry_count}");
        let _ = std::io::Write::flush(&mut std::io::stdout());
    }
    println!();
}

fn percentile(sorted: &[Duration], pct: f64) -> Duration {
    let idx = ((sorted.len() as f64) * pct / 100.0).ceil() as usize;
    sorted[idx.min(sorted.len()) - 1]
}

fn main() {
    let entry_count = parse_args();

    let db_path = "/tmp/singapur_bench.db";
    if std::path::Path::new(db_path).exists() {
        std::fs::remove_file(db_path).ok();
    }

    let conn = Connection::open(db_path).expect("open db");
    run_migrations(&conn).expect("migrations");

    seed_entries(&conn, entry_count);

    let queries_to_run = [
        ("app", Some("en"), "prefix — common prefix (high result count)"),
        ("app0",  Some("en"), "exact — first entry"),
        ("run", Some("en"), "prefix — mid-alphabet prefix"),
        ("run50000", Some("en"), "exact — specific mid-range entry"),
        ("zone", Some("en"), "prefix — end-of-alphabet prefix"),
        ("zzz", Some("en"), "no-match — term not in index"),
    ];

    println!("\nRunning {} search iterations per query pattern...\n", SEARCH_ITERATIONS);

    let mut all_timings: Vec<Duration> = Vec::with_capacity(SEARCH_ITERATIONS * queries_to_run.len());
    let mut pass = true;

    for (q, lang, label) in &queries_to_run {
        let mut timings: Vec<Duration> = Vec::with_capacity(SEARCH_ITERATIONS);
        for _ in 0..SEARCH_ITERATIONS {
            let start = Instant::now();
            let _ = queries::search_headwords(&conn, q, *lang, None, 50).expect("search");
            timings.push(start.elapsed());
        }
        timings.sort();
        all_timings.extend_from_slice(&timings);

        let p50 = percentile(&timings, 50.0);
        let p95 = percentile(&timings, 95.0);
        let p99 = percentile(&timings, 99.0);
        let gate = if p95.as_millis() < P95_LIMIT_MS { "✓ PASS" } else { "✗ FAIL"; pass = false; "✗ FAIL" };

        println!("Query: {:?} ({})", q, label);
        println!("  p50={:.1}ms  p95={:.1}ms  p99={:.1}ms  [{gate}]",
            p50.as_secs_f64() * 1000.0,
            p95.as_secs_f64() * 1000.0,
            p99.as_secs_f64() * 1000.0,
        );
    }

    all_timings.sort();
    let overall_p95 = percentile(&all_timings, 95.0);
    let overall_p99 = percentile(&all_timings, 99.0);

    println!("\n─────────────────────────────────────────");
    println!("Overall ({} searches, {} entries):", all_timings.len(), entry_count);
    println!("  p95 = {:.2}ms  p99 = {:.2}ms",
        overall_p95.as_secs_f64() * 1000.0,
        overall_p99.as_secs_f64() * 1000.0,
    );

    if pass {
        println!("  ✓ PASS: p95 < {}ms gate", P95_LIMIT_MS);
    } else {
        println!("  ✗ FAIL: p95 >= {}ms — consider FTS5 optimization", P95_LIMIT_MS);
        std::process::exit(1);
    }

    std::fs::remove_file(db_path).ok();
}
