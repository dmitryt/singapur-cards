//! One-time-style backfill of `sync_changes` for rows that exist in user tables but were never
//! logged (e.g. data created before sync triggers, or before `sync_devices.is_local` existed).
//! Without this, `collect_changes_since` has nothing to send to mobile despite a non-empty DB.

use rusqlite::{Connection, Result};
use serde_json::json;
use uuid::Uuid;

fn max_global_clock(conn: &Connection) -> Result<i64> {
    let v: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(lc), 0) FROM (
                SELECT MAX(logical_clock) AS lc FROM sync_changes
                UNION ALL
                SELECT MAX(logical_clock) AS lc FROM sync_tombstones
            )",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    Ok(v)
}

fn insert_change(
    conn: &Connection,
    device_id: &str,
    table_name: &str,
    row_id: &str,
    op_type: &str,
    logical_clock: i64,
    payload: &serde_json::Value,
) -> Result<()> {
    let id = Uuid::new_v4().to_string();
    let payload_json = payload.to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            id,
            device_id,
            table_name,
            row_id,
            op_type,
            logical_clock,
            payload_json,
            now
        ],
    )?;
    Ok(())
}

/// Inserts `sync_changes` rows for any live rows missing a changelog entry for `local_device_id`.
/// Safe to call on every launch (idempotent via `NOT EXISTS`).
pub fn run_desktop_sync_backfill(conn: &Connection, local_device_id: &str) -> Result<usize> {
    let tx = conn.unchecked_transaction()?;
    let mut clock = max_global_clock(&tx)?;
    let mut n = 0usize;

    // Order respects FKs: collections and cards before memberships; conversations before messages.
    {
        let mut stmt = tx.prepare(
            "SELECT id, name, description, created_at, updated_at FROM collections c
             WHERE NOT EXISTS (
               SELECT 1 FROM sync_changes sc
               WHERE sc.device_id = ?1 AND sc.table_name = 'collections' AND sc.row_id = c.id
             )
             ORDER BY c.created_at, c.id",
        )?;
        let collected = stmt
            .query_map(rusqlite::params![local_device_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, Option<String>>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        for (id, name, description, created_at, updated_at) in collected {
            clock += 1;
            insert_change(
                &tx,
                local_device_id,
                "collections",
                &id,
                "update",
                clock,
                &json!({
                    "id": id,
                    "name": name,
                    "description": description,
                    "created_at": created_at,
                    "updated_at": updated_at,
                }),
            )?;
            n += 1;
        }
    }

    {
        let mut stmt = tx.prepare(
            "SELECT id, language, headword, answer_text, example_text, notes, audio_reference,
                    source_entry_ids, learning_status, created_at, updated_at, last_reviewed_at
             FROM cards c
             WHERE NOT EXISTS (
               SELECT 1 FROM sync_changes sc
               WHERE sc.device_id = ?1 AND sc.table_name = 'cards' AND sc.row_id = c.id
             )
             ORDER BY c.created_at, c.id",
        )?;
        let collected = stmt
            .query_map(rusqlite::params![local_device_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, Option<String>>(4)?,
                    r.get::<_, Option<String>>(5)?,
                    r.get::<_, Option<String>>(6)?,
                    r.get::<_, Option<String>>(7)?,
                    r.get::<_, String>(8)?,
                    r.get::<_, String>(9)?,
                    r.get::<_, String>(10)?,
                    r.get::<_, Option<String>>(11)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        for (
            id,
            language,
            headword,
            answer_text,
            example_text,
            notes,
            audio_reference,
            source_entry_ids,
            learning_status,
            created_at,
            updated_at,
            last_reviewed_at,
        ) in collected
        {
            clock += 1;
            insert_change(
                &tx,
                local_device_id,
                "cards",
                &id,
                "update",
                clock,
                &json!({
                    "id": id,
                    "language": language,
                    "headword": headword,
                    "answer_text": answer_text,
                    "example_text": example_text,
                    "notes": notes,
                    "audio_reference": audio_reference,
                    "source_entry_ids": source_entry_ids,
                    "learning_status": learning_status,
                    "created_at": created_at,
                    "updated_at": updated_at,
                    "last_reviewed_at": last_reviewed_at,
                }),
            )?;
            n += 1;
        }
    }

    {
        let mut stmt = tx.prepare(
            "SELECT collection_id, card_id, created_at FROM collection_memberships m
             WHERE NOT EXISTS (
               SELECT 1 FROM sync_changes sc
               WHERE sc.device_id = ?1
                 AND sc.table_name = 'collection_memberships'
                 AND sc.row_id = m.collection_id || ':' || m.card_id
             )
             ORDER BY m.created_at, m.collection_id, m.card_id",
        )?;
        let collected = stmt
            .query_map(rusqlite::params![local_device_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        for (collection_id, card_id, created_at) in collected {
            let row_id = format!("{collection_id}:{card_id}");
            clock += 1;
            insert_change(
                &tx,
                local_device_id,
                "collection_memberships",
                &row_id,
                "insert",
                clock,
                &json!({
                    "collection_id": collection_id,
                    "card_id": card_id,
                    "created_at": created_at,
                }),
            )?;
            n += 1;
        }
    }

    {
        let mut stmt = tx.prepare(
            "SELECT id, card_id, result, reviewed_at FROM review_events e
             WHERE NOT EXISTS (
               SELECT 1 FROM sync_changes sc
               WHERE sc.device_id = ?1 AND sc.table_name = 'review_events' AND sc.row_id = e.id
             )
             ORDER BY e.reviewed_at, e.id",
        )?;
        let collected = stmt
            .query_map(rusqlite::params![local_device_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        for (id, card_id, result, reviewed_at) in collected {
            clock += 1;
            insert_change(
                &tx,
                local_device_id,
                "review_events",
                &id,
                "insert",
                clock,
                &json!({
                    "id": id,
                    "card_id": card_id,
                    "result": result,
                    "reviewed_at": reviewed_at,
                }),
            )?;
            n += 1;
        }
    }

    {
        let mut stmt = tx.prepare(
            "SELECT id, title, model, collection_id, created_at, updated_at FROM chat_conversations c
             WHERE NOT EXISTS (
               SELECT 1 FROM sync_changes sc
               WHERE sc.device_id = ?1 AND sc.table_name = 'chat_conversations' AND sc.row_id = c.id
             )
             ORDER BY c.created_at, c.id",
        )?;
        let collected = stmt
            .query_map(rusqlite::params![local_device_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, Option<String>>(2)?,
                    r.get::<_, Option<String>>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, String>(5)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        for (id, title, model, collection_id, created_at, updated_at) in collected {
            clock += 1;
            insert_change(
                &tx,
                local_device_id,
                "chat_conversations",
                &id,
                "update",
                clock,
                &json!({
                    "id": id,
                    "title": title,
                    "model": model,
                    "collection_id": collection_id,
                    "created_at": created_at,
                    "updated_at": updated_at,
                }),
            )?;
            n += 1;
        }
    }

    {
        let mut stmt = tx.prepare(
            "SELECT id, conversation_id, role, body, metadata_json, created_at FROM chat_messages m
             WHERE NOT EXISTS (
               SELECT 1 FROM sync_changes sc
               WHERE sc.device_id = ?1 AND sc.table_name = 'chat_messages' AND sc.row_id = m.id
             )
             ORDER BY m.created_at, m.id",
        )?;
        let collected = stmt
            .query_map(rusqlite::params![local_device_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, Option<String>>(4)?,
                    r.get::<_, String>(5)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        for (id, conversation_id, role, body, metadata_json, created_at) in collected {
            clock += 1;
            insert_change(
                &tx,
                local_device_id,
                "chat_messages",
                &id,
                "insert",
                clock,
                &json!({
                    "id": id,
                    "conversation_id": conversation_id,
                    "role": role,
                    "body": body,
                    "metadata_json": metadata_json,
                    "created_at": created_at,
                }),
            )?;
            n += 1;
        }
    }

    {
        let mut stmt = tx.prepare(
            "SELECT id, name, title, provider, created_at FROM custom_chat_models m
             WHERE NOT EXISTS (
               SELECT 1 FROM sync_changes sc
               WHERE sc.device_id = ?1 AND sc.table_name = 'custom_chat_models' AND sc.row_id = m.id
             )
             ORDER BY m.created_at, m.id",
        )?;
        let collected = stmt
            .query_map(rusqlite::params![local_device_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        for (id, name, title, provider, created_at) in collected {
            clock += 1;
            insert_change(
                &tx,
                local_device_id,
                "custom_chat_models",
                &id,
                "update",
                clock,
                &json!({
                    "id": id,
                    "name": name,
                    "title": title,
                    "provider": provider,
                    "created_at": created_at,
                }),
            )?;
            n += 1;
        }
    }

    tx.commit()?;
    Ok(n)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::run_migrations;
    use rusqlite::Connection;

    #[test]
    fn backfill_inserts_cards_missing_from_sync_changes() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        // Insert card before local sync_devices so the insert trigger does not run (legacy shape).
        conn.execute(
            "INSERT INTO cards (id, language, headword, answer_text, example_text, notes, audio_reference, source_entry_ids, learning_status, created_at, updated_at, last_reviewed_at)
             VALUES ('c1', 'en', 'h', 'a', NULL, NULL, NULL, '[]', 'unreviewed', ?1, ?1, NULL)",
            [&now],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO sync_devices (id, display_name, is_local, created_at) VALUES ('desk', 'D', 1, ?1)",
            [&now],
        )
        .unwrap();
        let n = run_desktop_sync_backfill(&conn, "desk").unwrap();
        assert_eq!(n, 1);
        let cnt: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sync_changes WHERE device_id = 'desk' AND table_name = 'cards'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(cnt, 1);
    }
}
