use once_cell::sync::Lazy;

static RE_TAGS: Lazy<regex::Regex> = Lazy::new(|| regex::Regex::new(r"\[[^\]]*\]").unwrap());
static RE_SPACES: Lazy<regex::Regex> = Lazy::new(|| regex::Regex::new(r"  +").unwrap());
static RE_TRN: Lazy<regex::Regex> = Lazy::new(|| regex::Regex::new(r"\[trn\](.*?)\[/trn\]").unwrap());
static RE_EX: Lazy<regex::Regex> = Lazy::new(|| regex::Regex::new(r"\[ex\](.*?)\[/ex\]").unwrap());

/// Represents one fully parsed DSL entry
#[derive(Debug, Clone)]
pub struct ParsedEntry {
    pub headwords: Vec<String>,
    pub definition_text: String,
    pub example_text: Option<String>,
    pub transcription: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
enum ParserState {
    Idle,
    InEntry,
}

fn is_header_directive(line: &str) -> bool {
    line.starts_with("#NAME")
        || line.starts_with("#INDEX_LANGUAGE")
        || line.starts_with("#CONTENTS_LANGUAGE")
        || line.starts_with("#DESCRIPTION")
        || line.starts_with("#SOURCE_URL")
        || line.starts_with("#ICON")
}

fn is_headword_line(line: &str) -> bool {
    if line.trim().is_empty() {
        return false;
    }
    if is_header_directive(line) {
        return false;
    }
    if line.starts_with(' ') || line.starts_with('\t') {
        return false;
    }
    true
}

/// Strips DSL markup tags like [p], [/p], [ex], [/ex], [b], [/b], [trn], [/trn], {, }
/// Also strips pronunciation notation like \[...\]
pub fn strip_dsl_tags(text: &str) -> String {
    // Remove DSL tags: [tagname], [/tagname], [tagname value]
    let stripped = RE_TAGS.replace_all(text, "");
    // Remove { } markers
    let stripped = stripped.replace('{', "").replace('}', "");
    // Collapse multiple spaces
    RE_SPACES.replace_all(stripped.trim(), " ").to_string()
}

/// Extracts transcription from [trn]...[/trn] sections
fn extract_transcription(line: &str) -> Option<String> {
    RE_TRN
        .captures(line)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .filter(|s| !s.is_empty())
}

/// Extracts example text from [ex]...[/ex] sections or from `\[example\]` notation
fn extract_example(line: &str) -> Option<String> {
    if let Some(caps) = RE_EX.captures(line) {
        if let Some(m) = caps.get(1) {
            let text = m.as_str().trim().to_string();
            if !text.is_empty() {
                return Some(text);
            }
        }
    }
    None
}

/// Parses DSL file content into a list of entries.
/// Returns (entries, skipped_count)
pub fn parse_dsl(content: &str) -> (Vec<ParsedEntry>, u64) {
    let mut entries: Vec<ParsedEntry> = Vec::new();
    let mut skipped: u64 = 0;

    let mut current_headwords: Vec<String> = Vec::new();
    let mut definition_lines: Vec<String> = Vec::new();
    let mut example_lines: Vec<String> = Vec::new();
    let mut transcription: Option<String> = None;
    let mut state = ParserState::Idle;

    let flush_entry = |
        headwords: &mut Vec<String>,
        def_lines: &mut Vec<String>,
        ex_lines: &mut Vec<String>,
        transcription: &mut Option<String>,
        entries: &mut Vec<ParsedEntry>,
        skipped: &mut u64,
    | {
        if headwords.is_empty() {
            if !def_lines.is_empty() {
                *skipped += 1;
            }
            def_lines.clear();
            ex_lines.clear();
            *transcription = None;
            return;
        }

        let definition_text = def_lines.join("\n").trim().to_string();
        if definition_text.is_empty() {
            *skipped += headwords.len() as u64;
        } else {
            let example_text = if ex_lines.is_empty() {
                None
            } else {
                Some(ex_lines.join("\n").trim().to_string())
            };
            entries.push(ParsedEntry {
                headwords: headwords.clone(),
                definition_text,
                example_text,
                transcription: transcription.clone(),
            });
        }

        headwords.clear();
        def_lines.clear();
        ex_lines.clear();
        *transcription = None;
    };

    for raw_line in content.lines() {
        let line = raw_line.trim_end();

        // Skip DSL header directives.
        if is_header_directive(line) {
            continue;
        }

        // Headword line: non-indented content line (with or without '#').
        if is_headword_line(line) {
            // Start or continue a headword group
            if state == ParserState::InEntry && !definition_lines.is_empty() {
                // Only flush if we already collected definition lines — this is a new entry
                flush_entry(
                    &mut current_headwords,
                    &mut definition_lines,
                    &mut example_lines,
                    &mut transcription,
                    &mut entries,
                    &mut skipped,
                );
            }
            let headword = line.trim_start_matches('#').trim().to_string();
            if !headword.is_empty() {
                current_headwords.push(headword);
            }
            state = ParserState::InEntry;
            continue;
        }

        if state == ParserState::InEntry {
            // Definition/example line
            if line.is_empty() {
                // Empty line = end of entry
                flush_entry(
                    &mut current_headwords,
                    &mut definition_lines,
                    &mut example_lines,
                    &mut transcription,
                    &mut entries,
                    &mut skipped,
                );
                state = ParserState::Idle;
                continue;
            }

            // Try to extract transcription
            if transcription.is_none() {
                transcription = extract_transcription(line);
            }

            // Try to extract example
            if let Some(ex) = extract_example(line) {
                example_lines.push(ex);
            }

            // Keep raw DSL markup — tags are converted to HTML on the frontend
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                definition_lines.push(trimmed.to_string());
            }
        }
    }

    // Flush last entry
    if state == ParserState::InEntry {
        flush_entry(
            &mut current_headwords,
            &mut definition_lines,
            &mut example_lines,
            &mut transcription,
            &mut entries,
            &mut skipped,
        );
    }

    (entries, skipped)
}

/// Normalize headword for search indexing
pub fn normalize_headword(headword: &str) -> String {
    headword.trim().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_entry() {
        let content = "#hello\n  a greeting\n\n";
        let (entries, skipped) = parse_dsl(content);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].headwords, vec!["hello"]);
        assert!(entries[0].definition_text.contains("a greeting"));
        assert_eq!(skipped, 0);
    }

    #[test]
    fn test_multi_headword() {
        let content = "#colour\n#color\n  a visual property\n\n";
        let (entries, skipped) = parse_dsl(content);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].headwords.len(), 2);
        assert_eq!(skipped, 0);
    }

    #[test]
    fn test_preserves_dsl_tags() {
        let content = "#test\n  [p]noun[/p] a test value [ex]example[/ex]\n\n";
        let (entries, _) = parse_dsl(content);
        assert_eq!(entries.len(), 1);
        assert!(entries[0].definition_text.contains("[p]"));
    }

    #[test]
    fn test_skips_malformed_entry() {
        let content = "#orphan\n\n";
        let (_entries, skipped) = parse_dsl(content);
        assert_eq!(skipped, 1);
    }

    #[test]
    fn test_partial_malformed() {
        let content = "#good\n  a good word\n\n#bad\n\n";
        let (entries, skipped) = parse_dsl(content);
        assert_eq!(entries.len(), 1);
        assert_eq!(skipped, 1);
    }

    #[test]
    fn test_fully_corrupt() {
        let content = "no headwords here\njust random text\n";
        let (entries, _skipped) = parse_dsl(content);
        assert_eq!(entries.len(), 0);
    }

    #[test]
    fn test_strip_dsl_tags_function() {
        assert_eq!(strip_dsl_tags("[b]bold[/b] text"), "bold text");
        assert_eq!(strip_dsl_tags("{word} definition"), "word definition");
    }
}
