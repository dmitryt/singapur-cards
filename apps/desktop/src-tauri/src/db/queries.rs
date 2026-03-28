use chrono::{Duration, Utc};
use rusqlite::{Connection, Result, params};
use crate::models::*;

// ── Dictionary helpers ────────────────────────────────────────────────────────

pub fn insert_dictionary(conn: &Connection, dict: &Dictionary) -> Result<()> {
    conn.execute(
        "INSERT INTO dictionaries
            (id, name, language_from, language_to, source_filename, source_path,
             import_status, entry_count, last_error, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        params![
            dict.id, dict.name, dict.language_from, dict.language_to,
            dict.source_filename, dict.source_path, dict.import_status,
            dict.entry_count, dict.last_error, dict.created_at, dict.updated_at
        ],
    )?;
    Ok(())
}

pub fn update_dictionary_status(
    conn: &Connection,
    dict_id: &str,
    status: &str,
    entry_count: i64,
    last_error: Option<&str>,
    updated_at: &str,
) -> Result<()> {
    conn.execute(
        "UPDATE dictionaries SET import_status=?1, entry_count=?2, last_error=?3, updated_at=?4
         WHERE id=?5",
        params![status, entry_count, last_error, updated_at, dict_id],
    )?;
    Ok(())
}

pub fn fetch_all_dictionaries(conn: &Connection) -> Result<Vec<Dictionary>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, language_from, language_to, source_filename, source_path,
                import_status, entry_count, last_error, created_at, updated_at
         FROM dictionaries ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Dictionary {
            id: row.get(0)?,
            name: row.get(1)?,
            language_from: row.get(2)?,
            language_to: row.get(3)?,
            source_filename: row.get(4)?,
            source_path: row.get(5)?,
            import_status: row.get(6)?,
            entry_count: row.get(7)?,
            last_error: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    rows.collect()
}

pub fn delete_dictionary(conn: &Connection, dict_id: &str) -> Result<usize> {
    let n = conn.execute("DELETE FROM dictionaries WHERE id=?1", params![dict_id])?;
    Ok(n)
}

pub fn insert_dictionary_entry(conn: &Connection, entry: &DictionaryEntry) -> Result<()> {
    conn.execute(
        "INSERT INTO dictionary_entries
            (id, dictionary_id, headword, normalized_headword, transcription,
             definition_text, example_text, audio_reference, source_order, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        params![
            entry.id, entry.dictionary_id, entry.headword, entry.normalized_headword,
            entry.transcription, entry.definition_text, entry.example_text,
            entry.audio_reference, entry.source_order, entry.created_at
        ],
    )?;
    Ok(())
}

// ── Search helpers ────────────────────────────────────────────────────────────

pub struct SearchResult {
    pub headword: String,
    pub language: String,
    pub source_entry_ids: Vec<String>,
    pub preview_text: String,
    pub match_kind: String,
    pub contributing_dictionary_count: i64,
}

pub fn search_headwords(
    conn: &Connection,
    query: &str,
    search_language: Option<&str>,
    dictionary_ids: Option<&[String]>,
    limit: usize,
) -> Result<Vec<SearchResult>> {
    let normalized_query = normalize_headword(query);
    let mut results: Vec<SearchResult> = Vec::new();

    // First: exact matches
    let exact_results = search_by_match_kind(
        conn, &normalized_query, search_language, dictionary_ids, "exact", limit,
    )?;
    results.extend(exact_results);

    // Then: prefix matches (exclude already-found exact headwords)
    let exact_headwords: std::collections::HashSet<String> =
        results.iter().map(|r| r.headword.clone()).collect();
    let prefix_limit = limit.saturating_sub(results.len());
    if prefix_limit > 0 {
        let prefix_results = search_by_match_kind(
            conn, &normalized_query, search_language, dictionary_ids, "prefix", prefix_limit,
        )?;
        for r in prefix_results {
            if !exact_headwords.contains(&r.headword) {
                results.push(r);
            }
        }
    }

    Ok(results)
}

fn search_by_match_kind(
    conn: &Connection,
    normalized_query: &str,
    search_language: Option<&str>,
    _dictionary_ids: Option<&[String]>,
    match_kind: &str,
    limit: usize,
) -> Result<Vec<SearchResult>> {
    let fts_query = if match_kind == "exact" {
        format!("\"{}\"", normalized_query.replace('"', "\"\""))
    } else {
        format!("\"{}\"*", normalized_query.replace('"', "\"\""))
    };

    // Build query with optional filters
    let lang_filter = if search_language.is_some() {
        "AND d.language_from = ?3"
    } else {
        ""
    };

    let sql = format!(
        "SELECT de.headword, d.language_from,
                GROUP_CONCAT(de.id) as entry_ids,
                de.definition_text as preview_text,
                COUNT(DISTINCT de.dictionary_id) as dict_count
         FROM dictionary_entries_fts fts
         JOIN dictionary_entries de ON de.rowid = fts.rowid
         JOIN dictionaries d ON d.id = de.dictionary_id
         WHERE fts.normalized_headword MATCH ?1
           AND d.import_status = 'ready'
           {lang_filter}
         GROUP BY de.normalized_headword, d.language_from
         ORDER BY de.normalized_headword ASC
         LIMIT ?2"
    );

    let mut stmt = conn.prepare(&sql)?;

    let rows = if let Some(lang) = search_language {
        stmt.query_map(params![fts_query, limit as i64, lang], |row| {
            let entry_ids_str: String = row.get(2)?;
            Ok(SearchResult {
                headword: row.get(0)?,
                language: row.get(1)?,
                source_entry_ids: entry_ids_str.split(',').map(String::from).collect(),
                preview_text: row.get(3)?,
                match_kind: match_kind.to_string(),
                contributing_dictionary_count: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()
    } else {
        stmt.query_map(params![fts_query, limit as i64], |row| {
            let entry_ids_str: String = row.get(2)?;
            Ok(SearchResult {
                headword: row.get(0)?,
                language: row.get(1)?,
                source_entry_ids: entry_ids_str.split(',').map(String::from).collect(),
                preview_text: row.get(3)?,
                match_kind: match_kind.to_string(),
                contributing_dictionary_count: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()
    };

    rows
}

pub fn get_headword_detail(
    conn: &Connection,
    headword: &str,
    language: &str,
) -> Result<Option<HeadwordDetail>> {
    let normalized = normalize_headword(headword);

    let mut stmt = conn.prepare(
        "SELECT de.id, de.dictionary_id, d.language_to, d.name,
                de.transcription, de.definition_text, de.example_text, de.audio_reference,
                de.headword, de.normalized_headword
         FROM dictionary_entries de
         JOIN dictionaries d ON d.id = de.dictionary_id
         WHERE de.normalized_headword = ?1
           AND d.language_from = ?2
           AND d.import_status = 'ready'
         ORDER BY de.source_order ASC",
    )?;

    let rows: Result<Vec<_>> = stmt.query_map(params![normalized, language], |row| {
        Ok((
            row.get::<_, String>(0)?,  // entry id
            row.get::<_, String>(1)?,  // dict id
            row.get::<_, String>(2)?,  // lang to
            row.get::<_, String>(3)?,  // dict name
            row.get::<_, Option<String>>(4)?,  // transcription
            row.get::<_, String>(5)?,  // definition
            row.get::<_, Option<String>>(6)?,  // example
            row.get::<_, Option<String>>(7)?,  // audio
            row.get::<_, String>(8)?,  // headword (display)
            row.get::<_, String>(9)?,  // normalized_headword
        ))
    })?.collect();

    let rows = rows?;
    if rows.is_empty() {
        return Ok(None);
    }

    let display_headword = rows[0].8.clone();
    let normalized_headword = rows[0].9.clone();
    let source_entry_ids: Vec<String> = rows.iter().map(|r| r.0.clone()).collect();
    let entries: Vec<HeadwordDetailEntry> = rows.iter().map(|r| HeadwordDetailEntry {
        entry_id: r.0.clone(),
        dictionary_id: r.1.clone(),
        language_to: r.2.clone(),
        dictionary_name: r.3.clone(),
        transcription: r.4.clone(),
        definition_text: r.5.clone(),
        example_text: r.6.clone(),
        audio_reference: r.7.clone(),
    }).collect();

    Ok(Some(HeadwordDetail {
        headword: display_headword,
        language: language.to_string(),
        normalized_headword,
        source_entry_ids,
        entries,
    }))
}

// ── Card helpers ──────────────────────────────────────────────────────────────

pub fn insert_card(conn: &Connection, card: &Card) -> Result<()> {
    let source_ids_json = serde_json::to_string(&card.source_entry_ids).unwrap_or_default();
    conn.execute(
        "INSERT INTO cards
            (id, language, headword, answer_text, example_text, notes, audio_reference,
             source_entry_ids, learning_status, created_at, updated_at, last_reviewed_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![
            card.id, card.language, card.headword, card.answer_text,
            card.example_text, card.notes, card.audio_reference,
            source_ids_json, card.learning_status,
            card.created_at, card.updated_at, card.last_reviewed_at
        ],
    )?;
    Ok(())
}

pub fn fetch_card_by_id(conn: &Connection, card_id: &str) -> Result<Option<Card>> {
    let mut stmt = conn.prepare(
        "SELECT id, language, headword, answer_text, example_text, notes, audio_reference,
                source_entry_ids, learning_status, created_at, updated_at, last_reviewed_at
         FROM cards WHERE id=?1",
    )?;
    let mut rows = stmt.query_map(params![card_id], |row| {
        let src_ids_str: String = row.get(7)?;
        let source_entry_ids: Vec<String> = serde_json::from_str(&src_ids_str).unwrap_or_default();
        Ok(Card {
            id: row.get(0)?,
            language: row.get(1)?,
            headword: row.get(2)?,
            answer_text: row.get(3)?,
            example_text: row.get(4)?,
            notes: row.get(5)?,
            audio_reference: row.get(6)?,
            source_entry_ids,
            learning_status: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            last_reviewed_at: row.get(11)?,
        })
    })?;
    rows.next().transpose()
}

pub fn fetch_card_by_headword_language(conn: &Connection, headword: &str, language: &str) -> Result<Option<Card>> {
    let mut stmt = conn.prepare(
        "SELECT id, language, headword, answer_text, example_text, notes, audio_reference,
                source_entry_ids, learning_status, created_at, updated_at, last_reviewed_at
         FROM cards WHERE headword=?1 AND language=?2",
    )?;
    let mut rows = stmt.query_map(params![headword, language], |row| {
        let src_ids_str: String = row.get(7)?;
        let source_entry_ids: Vec<String> = serde_json::from_str(&src_ids_str).unwrap_or_default();
        Ok(Card {
            id: row.get(0)?,
            language: row.get(1)?,
            headword: row.get(2)?,
            answer_text: row.get(3)?,
            example_text: row.get(4)?,
            notes: row.get(5)?,
            audio_reference: row.get(6)?,
            source_entry_ids,
            learning_status: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            last_reviewed_at: row.get(11)?,
        })
    })?;
    rows.next().transpose()
}

pub fn fetch_all_cards(conn: &Connection, collection_id: Option<&str>, learning_status: Option<&str>) -> Result<Vec<Card>> {
    let mut sql = String::from(
        "SELECT c.id, c.language, c.headword, c.answer_text, c.example_text, c.notes,
                c.audio_reference, c.source_entry_ids, c.learning_status,
                c.created_at, c.updated_at, c.last_reviewed_at
         FROM cards c",
    );

    if collection_id.is_some() {
        sql.push_str(" JOIN collection_memberships cm ON cm.card_id = c.id AND cm.collection_id = ?1");
    }

    let mut conditions = Vec::new();
    if learning_status.is_some() {
        let idx = if collection_id.is_some() { "?2" } else { "?1" };
        conditions.push(format!("c.learning_status = {idx}"));
    }

    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }

    sql.push_str(" ORDER BY c.created_at DESC");

    let mut stmt = conn.prepare(&sql)?;

    let parse_card = |row: &rusqlite::Row| {
        let src_ids_str: String = row.get(7)?;
        let source_entry_ids: Vec<String> = serde_json::from_str(&src_ids_str).unwrap_or_default();
        Ok(Card {
            id: row.get(0)?,
            language: row.get(1)?,
            headword: row.get(2)?,
            answer_text: row.get(3)?,
            example_text: row.get(4)?,
            notes: row.get(5)?,
            audio_reference: row.get(6)?,
            source_entry_ids,
            learning_status: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            last_reviewed_at: row.get(11)?,
        })
    };

    match (collection_id, learning_status) {
        (Some(cid), Some(ls)) => stmt.query_map(params![cid, ls], parse_card)?.collect(),
        (Some(cid), None) => stmt.query_map(params![cid], parse_card)?.collect(),
        (None, Some(ls)) => stmt.query_map(params![ls], parse_card)?.collect(),
        (None, None) => stmt.query_map([], parse_card)?.collect(),
    }
}

pub fn update_card_row(conn: &Connection, card: &Card) -> Result<()> {
    let source_ids_json = serde_json::to_string(&card.source_entry_ids).unwrap_or_default();
    conn.execute(
        "UPDATE cards SET language=?1, headword=?2, answer_text=?3, example_text=?4,
                notes=?5, audio_reference=?6, source_entry_ids=?7, updated_at=?8
         WHERE id=?9",
        params![
            card.language, card.headword, card.answer_text, card.example_text,
            card.notes, card.audio_reference, source_ids_json, card.updated_at,
            card.id
        ],
    )?;
    Ok(())
}

pub fn delete_card_row(conn: &Connection, card_id: &str) -> Result<usize> {
    let n = conn.execute("DELETE FROM cards WHERE id=?1", params![card_id])?;
    Ok(n)
}

pub fn replace_card_memberships(conn: &Connection, card_id: &str, collection_ids: &[String], now: &str) -> Result<()> {
    conn.execute("DELETE FROM collection_memberships WHERE card_id=?1", params![card_id])?;
    for cid in collection_ids {
        conn.execute(
            "INSERT OR IGNORE INTO collection_memberships (collection_id, card_id, created_at) VALUES (?1,?2,?3)",
            params![cid, card_id, now],
        )?;
    }
    Ok(())
}

pub fn fetch_card_collection_ids(conn: &Connection, card_id: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT collection_id FROM collection_memberships WHERE card_id=?1")?;
    let rows: Result<Vec<String>> = stmt.query_map(params![card_id], |row| row.get(0))?.collect();
    rows
}

// ── Collection helpers ────────────────────────────────────────────────────────

pub fn insert_collection(conn: &Connection, coll: &Collection) -> Result<()> {
    conn.execute(
        "INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?1,?2,?3,?4,?5)",
        params![coll.id, coll.name, coll.description, coll.created_at, coll.updated_at],
    )?;
    Ok(())
}

pub fn fetch_all_collections(conn: &Connection) -> Result<Vec<(Collection, i64)>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.description, c.created_at, c.updated_at,
                COUNT(cm.card_id) as card_count
         FROM collections c
         LEFT JOIN collection_memberships cm ON cm.collection_id = c.id
         GROUP BY c.id
         ORDER BY c.created_at ASC",
    )?;
    let rows: Result<Vec<_>> = stmt.query_map([], |row| {
        Ok((Collection {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        }, row.get::<_, i64>(5)?))
    })?.collect();
    rows
}

pub fn update_collection_name(conn: &Connection, coll_id: &str, new_name: &str, updated_at: &str) -> Result<usize> {
    let n = conn.execute(
        "UPDATE collections SET name=?1, updated_at=?2 WHERE id=?3",
        params![new_name, updated_at, coll_id],
    )?;
    Ok(n)
}

pub fn delete_collection_row(conn: &Connection, coll_id: &str) -> Result<usize> {
    let n = conn.execute("DELETE FROM collections WHERE id=?1", params![coll_id])?;
    Ok(n)
}

// ── Review helpers ────────────────────────────────────────────────────────────

pub fn fetch_cards_for_review(conn: &Connection, collection_id: Option<&str>) -> Result<Vec<(String, String)>> {
    let sql = if collection_id.is_some() {
        "SELECT c.id, c.learning_status FROM cards c
         JOIN collection_memberships cm ON cm.card_id = c.id AND cm.collection_id = ?1
         ORDER BY c.created_at ASC"
    } else {
        "SELECT id, learning_status FROM cards ORDER BY created_at ASC"
    };

    let mut stmt = conn.prepare(sql)?;
    let rows: Result<Vec<_>> = if let Some(cid) = collection_id {
        stmt.query_map(params![cid], |row| Ok((row.get(0)?, row.get(1)?)))?.collect()
    } else {
        stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?.collect()
    };
    rows
}

pub fn insert_review_event(conn: &Connection, event: &ReviewEvent) -> Result<()> {
    conn.execute(
        "INSERT INTO review_events (id, card_id, result, reviewed_at) VALUES (?1,?2,?3,?4)",
        params![event.id, event.card_id, event.result, event.reviewed_at],
    )?;
    Ok(())
}

pub fn update_card_learning_status(conn: &Connection, card_id: &str, status: &str, reviewed_at: &str, updated_at: &str) -> Result<()> {
    conn.execute(
        "UPDATE cards SET learning_status=?1, last_reviewed_at=?2, updated_at=?3 WHERE id=?4",
        params![status, reviewed_at, updated_at, card_id],
    )?;
    Ok(())
}

// ── Language helpers ───────────────────────────────────────────────────────────

pub fn insert_language(conn: &Connection, code: &str, title: &str, created_at: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO languages (code, title, created_at) VALUES (?1, ?2, ?3)",
        params![code, title, created_at],
    )?;
    Ok(())
}

pub fn fetch_all_languages(conn: &Connection) -> Result<Vec<Language>> {
    let mut stmt = conn.prepare(
        "SELECT code, title, created_at FROM languages ORDER BY title ASC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Language {
            code: row.get(0)?,
            title: row.get(1)?,
            created_at: row.get(2)?,
        })
    })?;
    rows.collect()
}

pub fn fetch_language_count(conn: &Connection) -> Result<i64> {
    conn.query_row("SELECT COUNT(*) FROM languages", [], |row| row.get(0))
}

pub fn update_language_title(conn: &Connection, code: &str, title: &str) -> Result<usize> {
    let n = conn.execute(
        "UPDATE languages SET title=?1 WHERE code=?2",
        params![title, code],
    )?;
    Ok(n)
}

pub fn delete_language(conn: &Connection, code: &str) -> Result<usize> {
    let n = conn.execute("DELETE FROM languages WHERE code=?1", params![code])?;
    Ok(n)
}

pub fn list_headwords_for_language(conn: &Connection, language: &str, limit: i64) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT de.headword
         FROM dictionary_entries de
         JOIN dictionaries d ON d.id = de.dictionary_id
         WHERE d.language_from = ?1 AND d.import_status = 'ready'
         ORDER BY de.headword ASC
         LIMIT ?2",
    )?;
    let rows: Result<Vec<String>> = stmt.query_map(params![language, limit], |row| row.get(0))?.collect();
    rows
}

// ── Chat history ────────────────────────────────────────────────────────────

const NEW_CHAT_TITLE: &str = "New chat";

/// Insert a new empty conversation row.
pub fn insert_chat_conversation(
    conn: &Connection,
    id: &str,
    model: Option<&str>,
    collection_id: Option<&str>,
    created_at: &str,
    updated_at: &str,
) -> Result<()> {
    conn.execute(
        "INSERT INTO chat_conversations (id, title, model, collection_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, NEW_CHAT_TITLE, model, collection_id, created_at, updated_at],
    )?;
    Ok(())
}

pub fn chat_conversation_exists(conn: &Connection, id: &str) -> Result<bool> {
    let n: i64 = conn.query_row(
        "SELECT COUNT(*) FROM chat_conversations WHERE id = ?1",
        params![id],
        |row| row.get(0),
    )?;
    Ok(n > 0)
}

/// Deletes the conversation row; `chat_messages` rows cascade.
pub fn delete_chat_conversation_row(conn: &Connection, id: &str) -> Result<usize> {
    conn.execute(
        "DELETE FROM chat_conversations WHERE id = ?1",
        params![id],
    )
}

#[derive(Debug)]
pub struct ChatConversationListRow {
    pub id: String,
    pub title: String,
    pub updated_at: String,
    pub model: Option<String>,
    pub collection_id: Option<String>,
}

pub fn list_chat_conversations(conn: &Connection) -> Result<Vec<ChatConversationListRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, updated_at, model, collection_id
         FROM chat_conversations
         ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ChatConversationListRow {
            id: row.get(0)?,
            title: row.get(1)?,
            updated_at: row.get(2)?,
            model: row.get(3)?,
            collection_id: row.get(4)?,
        })
    })?;
    rows.collect()
}

#[derive(Debug)]
pub struct ChatMessageRow {
    pub id: String,
    pub role: String,
    pub body: String,
    pub metadata_json: Option<String>,
    pub created_at: String,
}

pub fn fetch_chat_messages(conn: &Connection, conversation_id: &str) -> Result<Vec<ChatMessageRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, role, body, metadata_json, created_at
         FROM chat_messages
         WHERE conversation_id = ?1
         ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map(params![conversation_id], |row| {
        Ok(ChatMessageRow {
            id: row.get(0)?,
            role: row.get(1)?,
            body: row.get(2)?,
            metadata_json: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect()
}

/// Persist one user + assistant exchange. Returns `(user_message_id, assistant_message_id)`.
pub fn append_chat_turn(
    conn: &mut Connection,
    conversation_id: &str,
    user_body: &str,
    assistant_body: &str,
    assistant_metadata_json: Option<&str>,
    model: Option<&str>,
    collection_id: Option<&str>,
) -> Result<(String, String)> {
    let base = Utc::now();
    let user_ts = base.to_rfc3339();
    let assistant_ts = (base + Duration::milliseconds(1)).to_rfc3339();

    let tx = conn.transaction()?;
    let user_id = uuid::Uuid::new_v4().to_string();
    let assistant_id = uuid::Uuid::new_v4().to_string();

    tx.execute(
        "INSERT INTO chat_messages (id, conversation_id, role, body, metadata_json, created_at)
         VALUES (?1, ?2, 'user', ?3, NULL, ?4)",
        params![user_id, conversation_id, user_body, user_ts],
    )?;
    tx.execute(
        "INSERT INTO chat_messages (id, conversation_id, role, body, metadata_json, created_at)
         VALUES (?1, ?2, 'assistant', ?3, ?4, ?5)",
        params![
            assistant_id,
            conversation_id,
            assistant_body,
            assistant_metadata_json,
            assistant_ts
        ],
    )?;

    let trimmed = user_body.trim();
    let char_count = trimmed.chars().count();
    let preview: String = trimmed.chars().take(80).collect();
    let preview = if char_count > 80 {
        format!("{preview}…")
    } else {
        preview
    };

    tx.execute(
        "UPDATE chat_conversations
         SET updated_at = ?1,
             model = ?2,
             collection_id = ?3,
             title = CASE WHEN title = ?4 AND LENGTH(?5) > 0 THEN ?5 ELSE title END
         WHERE id = ?6",
        params![
            assistant_ts,
            model,
            collection_id,
            NEW_CHAT_TITLE,
            preview,
            conversation_id
        ],
    )?;

    tx.commit()?;
    Ok((user_id, assistant_id))
}

// ── Chat / credential helpers ─────────────────────────────────────────────────

/// Fetch headwords for all cards in the given collection (for vocabulary context injection).
pub fn fetch_headwords_for_collection(conn: &Connection, collection_id: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT c.headword
         FROM cards c
         JOIN collection_memberships cm ON cm.card_id = c.id
         WHERE cm.collection_id = ?1
         ORDER BY c.headword ASC",
    )?;
    let rows: Result<Vec<String>> = stmt
        .query_map(params![collection_id], |row| row.get(0))?
        .collect();
    rows
}

/// Fetch the active credential metadata row for a given provider.
/// Returns `None` if no active credential exists for that provider.
pub fn fetch_active_credential(
    conn: &Connection,
    provider: &str,
) -> Result<Option<crate::models::AiCredential>> {
    let mut stmt = conn.prepare(
        "SELECT id, provider, label, is_active, created_at, updated_at
         FROM ai_credentials
         WHERE provider = ?1 AND is_active = 1
         LIMIT 1",
    )?;
    let mut rows = stmt.query_map(params![provider], |row| {
        Ok(crate::models::AiCredential {
            id: row.get(0)?,
            provider: row.get(1)?,
            label: row.get(2)?,
            is_active: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

// ── Utility ───────────────────────────────────────────────────────────────────

pub fn normalize_headword(headword: &str) -> String {
    headword.trim().to_lowercase()
}
