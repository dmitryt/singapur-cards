use std::fs;
use std::path::Path;

// Include dsl module for testing
fn parse_fixture(filename: &str) -> (Vec<singapur_cards_lib::dsl::parser::ParsedEntry>, u64) {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(filename);
    let content = fs::read_to_string(&path)
        .unwrap_or_else(|_| panic!("Failed to read fixture: {}", filename));
    singapur_cards_lib::dsl::parser::parse_dsl(&content)
}

#[test]
fn test_valid_dsl_fixture() {
    let (entries, skipped) = parse_fixture("valid.dsl");
    assert!(entries.len() >= 2, "Expected at least 2 entries, got {}", entries.len());
    assert_eq!(skipped, 0);
    // Check multi-headword entry
    let colour_entry = entries.iter().find(|e| e.headwords.iter().any(|h| h == "colour"));
    assert!(colour_entry.is_some(), "Expected colour/color entry");
    assert_eq!(colour_entry.unwrap().headwords.len(), 2);
}

#[test]
fn test_malformed_dsl_fixture() {
    let (entries, skipped) = parse_fixture("malformed.dsl");
    assert_eq!(entries.len(), 2, "Expected 2 good entries");
    assert_eq!(skipped, 1, "Expected 1 skipped (empty_entry)");
}

#[test]
fn test_with_examples_fixture() {
    let (entries, skipped) = parse_fixture("with_examples.dsl");
    assert_eq!(entries.len(), 2);
    assert_eq!(skipped, 0);
    let run_entry = entries.iter().find(|e| e.headwords.iter().any(|h| h == "run"));
    assert!(run_entry.is_some());
    assert!(run_entry.unwrap().example_text.is_some());
}
