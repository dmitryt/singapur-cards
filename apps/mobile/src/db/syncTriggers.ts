import { type SQLiteDatabase } from 'expo-sqlite';

/**
 * SQLite expression that returns the next Lamport clock value.
 * Reads the current max across both sync_changes and sync_tombstones
 * to ensure the global clock is strictly monotonically increasing.
 */
const NEXT_CLOCK = `
  COALESCE((SELECT MAX(lc) FROM (
    SELECT MAX(logical_clock) AS lc FROM sync_changes
    UNION ALL
    SELECT MAX(logical_clock) AS lc FROM sync_tombstones
  )), 0) + 1
`.trim();

/** SQLite expression that returns the local device_id from sync_devices. */
const LOCAL_DEVICE_ID = `(SELECT id FROM sync_devices WHERE is_local = 1 LIMIT 1)`;

/** Random hex ID for sync_changes / sync_tombstones rows. */
const RANDOM_ID = `lower(hex(randomblob(16)))`;

/**
 * Builds an INSERT trigger for sync_changes on a given table.
 * Only fires when a local device identity is registered.
 */
function insertTrigger(table: string, rowIdExpr: string, payloadExpr: string): string {
  return `
CREATE TRIGGER IF NOT EXISTS sync_trig_insert_${table}
AFTER INSERT ON ${table}
WHEN ${LOCAL_DEVICE_ID} IS NOT NULL
BEGIN
  INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
  VALUES (
    ${RANDOM_ID},
    ${LOCAL_DEVICE_ID},
    '${table}',
    ${rowIdExpr},
    'insert',
    ${NEXT_CLOCK},
    ${payloadExpr},
    datetime('now')
  );
END;`.trim();
}

/**
 * Builds an UPDATE trigger for sync_changes on a given table.
 * Only fires when a local device identity is registered.
 */
function updateTrigger(table: string, rowIdExpr: string, payloadExpr: string): string {
  return `
CREATE TRIGGER IF NOT EXISTS sync_trig_update_${table}
AFTER UPDATE ON ${table}
WHEN ${LOCAL_DEVICE_ID} IS NOT NULL
BEGIN
  INSERT INTO sync_changes (id, device_id, table_name, row_id, op_type, logical_clock, payload_json, created_at)
  VALUES (
    ${RANDOM_ID},
    ${LOCAL_DEVICE_ID},
    '${table}',
    ${rowIdExpr},
    'update',
    ${NEXT_CLOCK},
    ${payloadExpr},
    datetime('now')
  );
END;`.trim();
}

/**
 * Builds a DELETE trigger that writes to sync_tombstones.
 * Only fires when a local device identity is registered.
 */
function deleteTrigger(table: string, rowIdExpr: string): string {
  return `
CREATE TRIGGER IF NOT EXISTS sync_trig_delete_${table}
AFTER DELETE ON ${table}
WHEN ${LOCAL_DEVICE_ID} IS NOT NULL
BEGIN
  INSERT INTO sync_tombstones (id, device_id, table_name, row_id, logical_clock, deleted_at)
  VALUES (
    ${RANDOM_ID},
    ${LOCAL_DEVICE_ID},
    '${table}',
    ${rowIdExpr},
    ${NEXT_CLOCK},
    datetime('now')
  );
END;`.trim();
}

// ---------------------------------------------------------------------------
// Per-table payload expressions
// ---------------------------------------------------------------------------

const CARDS_PAYLOAD = `json_object(
  'id', NEW.id, 'language', NEW.language, 'headword', NEW.headword,
  'answer_text', NEW.answer_text, 'example_text', NEW.example_text,
  'notes', NEW.notes, 'audio_reference', NEW.audio_reference,
  'source_entry_ids', NEW.source_entry_ids, 'learning_status', NEW.learning_status,
  'created_at', NEW.created_at, 'updated_at', NEW.updated_at,
  'last_reviewed_at', NEW.last_reviewed_at
)`;

const COLLECTIONS_PAYLOAD = `json_object(
  'id', NEW.id, 'name', NEW.name, 'description', NEW.description,
  'created_at', NEW.created_at, 'updated_at', NEW.updated_at
)`;

const MEMBERSHIPS_PAYLOAD = `json_object(
  'collection_id', NEW.collection_id, 'card_id', NEW.card_id,
  'created_at', NEW.created_at
)`;

const REVIEW_EVENTS_PAYLOAD = `json_object(
  'id', NEW.id, 'card_id', NEW.card_id, 'result', NEW.result,
  'reviewed_at', NEW.reviewed_at
)`;

const CHAT_CONVERSATIONS_PAYLOAD = `json_object(
  'id', NEW.id, 'title', NEW.title, 'model', NEW.model,
  'collection_id', NEW.collection_id,
  'created_at', NEW.created_at, 'updated_at', NEW.updated_at
)`;

const CHAT_MESSAGES_PAYLOAD = `json_object(
  'id', NEW.id, 'conversation_id', NEW.conversation_id, 'role', NEW.role,
  'body', NEW.body, 'metadata_json', NEW.metadata_json, 'created_at', NEW.created_at
)`;

const CUSTOM_CHAT_MODELS_PAYLOAD = `json_object(
  'id', NEW.id, 'name', NEW.name, 'title', NEW.title,
  'provider', NEW.provider, 'created_at', NEW.created_at
)`;

// ---------------------------------------------------------------------------
// All trigger SQL statements
// ---------------------------------------------------------------------------

const TRIGGER_STATEMENTS: string[] = [
  // cards
  insertTrigger('cards', 'NEW.id', CARDS_PAYLOAD),
  updateTrigger('cards', 'NEW.id', CARDS_PAYLOAD),
  deleteTrigger('cards', 'OLD.id'),

  // collections
  insertTrigger('collections', 'NEW.id', COLLECTIONS_PAYLOAD),
  updateTrigger('collections', 'NEW.id', COLLECTIONS_PAYLOAD),
  deleteTrigger('collections', 'OLD.id'),

  // collection_memberships — composite PK, no updates
  insertTrigger('collection_memberships', "NEW.collection_id || ':' || NEW.card_id", MEMBERSHIPS_PAYLOAD),
  deleteTrigger('collection_memberships', "OLD.collection_id || ':' || OLD.card_id"),

  // review_events — append-only, no update or delete trigger
  insertTrigger('review_events', 'NEW.id', REVIEW_EVENTS_PAYLOAD),

  // chat_conversations
  insertTrigger('chat_conversations', 'NEW.id', CHAT_CONVERSATIONS_PAYLOAD),
  updateTrigger('chat_conversations', 'NEW.id', CHAT_CONVERSATIONS_PAYLOAD),
  deleteTrigger('chat_conversations', 'OLD.id'),

  // chat_messages — append-only writes, but can be deleted
  insertTrigger('chat_messages', 'NEW.id', CHAT_MESSAGES_PAYLOAD),
  deleteTrigger('chat_messages', 'OLD.id'),

  // custom_chat_models
  insertTrigger('custom_chat_models', 'NEW.id', CUSTOM_CHAT_MODELS_PAYLOAD),
  updateTrigger('custom_chat_models', 'NEW.id', CUSTOM_CHAT_MODELS_PAYLOAD),
  deleteTrigger('custom_chat_models', 'OLD.id'),
];

/**
 * Creates all sync triggers idempotently.
 * Safe to call on every app launch — uses CREATE TRIGGER IF NOT EXISTS.
 */
export function applySyncTriggers(expoDb: SQLiteDatabase): void {
  for (const sql of TRIGGER_STATEMENTS) {
    expoDb.execSync(sql);
  }
}
