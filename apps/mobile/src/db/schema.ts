import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const appMeta = sqliteTable('app_meta', {
  key:   text('key').primaryKey().notNull(),
  value: text('value'),
});

export const languages = sqliteTable('languages', {
  code:      text('code').primaryKey().notNull(),
  title:     text('title').notNull(),
  createdAt: text('created_at').notNull(),
});

export const dictionaries = sqliteTable('dictionaries', {
  id:             text('id').primaryKey().notNull(),
  name:           text('name').notNull().unique(),
  languageFrom:   text('language_from').notNull(),
  languageTo:     text('language_to').notNull(),
  sourceFilename: text('source_filename').notNull(),
  sourcePath:     text('source_path'),
  importStatus:   text('import_status', {
    enum: ['queued', 'importing', 'ready', 'failed'],
  }).notNull().default('queued'),
  entryCount:     integer('entry_count').notNull().default(0),
  lastError:      text('last_error'),
  createdAt:      text('created_at').notNull(),
  updatedAt:      text('updated_at').notNull(),
});

export const dictionaryEntries = sqliteTable('dictionary_entries', {
  id:                 text('id').primaryKey().notNull(),
  dictionaryId:       text('dictionary_id').notNull()
                        .references(() => dictionaries.id, { onDelete: 'cascade' }),
  headword:           text('headword').notNull(),
  normalizedHeadword: text('normalized_headword').notNull(),
  transcription:      text('transcription'),
  definitionText:     text('definition_text').notNull(),
  exampleText:        text('example_text'),
  audioReference:     text('audio_reference'),
  sourceOrder:        integer('source_order').notNull().default(0),
  createdAt:          text('created_at').notNull(),
}, (table) => [
  index('idx_dictionary_entries_dictionary_id').on(table.dictionaryId),
  index('idx_dictionary_entries_normalized_headword').on(table.normalizedHeadword),
]);

export const cards = sqliteTable('cards', {
  id:             text('id').primaryKey().notNull(),
  language:       text('language').notNull(),
  headword:       text('headword').notNull(),
  answerText:     text('answer_text').notNull(),
  exampleText:    text('example_text'),
  notes:          text('notes'),
  audioReference: text('audio_reference'),
  sourceEntryIds: text('source_entry_ids').notNull().default('[]'),
  learningStatus: text('learning_status', {
    enum: ['unreviewed', 'learned', 'not_learned'],
  }).notNull().default('unreviewed'),
  createdAt:      text('created_at').notNull(),
  updatedAt:      text('updated_at').notNull(),
  lastReviewedAt: text('last_reviewed_at'),
}, (table) => [
  uniqueIndex('ux_cards_headword_language').on(table.headword, table.language),
]);

export const collections = sqliteTable('collections', {
  id:          text('id').primaryKey().notNull(),
  name:        text('name').notNull().unique(),
  description: text('description'),
  createdAt:   text('created_at').notNull(),
  updatedAt:   text('updated_at').notNull(),
});

export const collectionMemberships = sqliteTable('collection_memberships', {
  collectionId: text('collection_id').notNull()
                  .references(() => collections.id, { onDelete: 'cascade' }),
  cardId:       text('card_id').notNull()
                  .references(() => cards.id, { onDelete: 'cascade' }),
  createdAt:    text('created_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.collectionId, table.cardId] }),
]);

export const reviewEvents = sqliteTable('review_events', {
  id:         text('id').primaryKey().notNull(),
  cardId:     text('card_id').notNull()
                .references(() => cards.id, { onDelete: 'cascade' }),
  result:     text('result', { enum: ['learned', 'not_learned'] }).notNull(),
  reviewedAt: text('reviewed_at').notNull(),
});

export const aiCredentials = sqliteTable('ai_credentials', {
  id:        text('id').primaryKey(),
  provider:  text('provider').notNull(),
  label:     text('label'),
  isActive:  integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  uniqueIndex('ux_ai_credentials_provider_active')
    .on(table.provider)
    .where(sql`${table.isActive} = 1`),
]);

export const chatConversations = sqliteTable('chat_conversations', {
  id:           text('id').primaryKey().notNull(),
  title:        text('title').notNull(),
  model:        text('model'),
  collectionId: text('collection_id'),
  createdAt:    text('created_at').notNull(),
  updatedAt:    text('updated_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id:             text('id').primaryKey().notNull(),
  conversationId: text('conversation_id').notNull()
                    .references(() => chatConversations.id, { onDelete: 'cascade' }),
  role:           text('role', { enum: ['user', 'assistant'] }).notNull(),
  body:           text('body').notNull(),
  metadataJson:   text('metadata_json'),
  createdAt:      text('created_at').notNull(),
}, (table) => [
  index('idx_chat_messages_conversation_created')
    .on(table.conversationId, table.createdAt),
]);

export const customChatModels = sqliteTable('custom_chat_models', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull().unique(),
  title:     text('title').notNull(),
  provider:  text('provider').notNull(),
  createdAt: text('created_at').notNull(),
});

// ---------------------------------------------------------------------------
// Sync metadata tables
// ---------------------------------------------------------------------------

/** Known local and remote device identities. Non-secret peer metadata only.
 *  Long-lived credentials are stored in expo-secure-store keyed by device id. */
export const syncDevices = sqliteTable('sync_devices', {
  id:          text('id').primaryKey().notNull(), // UUID device identifier
  displayName: text('display_name').notNull(),
  host:        text('host'),                      // null for the local device
  port:        integer('port'),                   // null for the local device
  isLocal:     integer('is_local', { mode: 'boolean' }).notNull().default(false),
  pairedAt:    text('paired_at'),
  lastSyncAt:  text('last_sync_at'),
  createdAt:   text('created_at').notNull(),
});

/** Local mutation log for rows that participate in sync v1.
 *  Covers INSERT and UPDATE operations. DELETEs go to sync_tombstones.
 *  Populated by SQLite triggers on synced domain tables. */
export const syncChanges = sqliteTable('sync_changes', {
  id:           text('id').primaryKey().notNull(),
  deviceId:     text('device_id').notNull(),
  tableName:    text('table_name').notNull(),
  rowId:        text('row_id').notNull(),
  opType:       text('op_type', { enum: ['insert', 'update'] }).notNull(),
  logicalClock: integer('logical_clock').notNull(),
  payloadJson:  text('payload_json').notNull(),
  requestId:    text('request_id'),    // set when received from a peer
  appliedAt:    text('applied_at'),    // null = unacknowledged local change
  createdAt:    text('created_at').notNull(),
}, (table) => [
  index('idx_sync_changes_device_clock').on(table.deviceId, table.logicalClock),
  index('idx_sync_changes_table_row').on(table.tableName, table.rowId),
  index('idx_sync_changes_applied_at').on(table.appliedAt),
]);

/** Delete records for rows that must remain deleted across peers. */
export const syncTombstones = sqliteTable('sync_tombstones', {
  id:           text('id').primaryKey().notNull(),
  deviceId:     text('device_id').notNull(),
  tableName:    text('table_name').notNull(),
  rowId:        text('row_id').notNull(),
  logicalClock: integer('logical_clock').notNull(),
  requestId:    text('request_id'),
  deletedAt:    text('deleted_at').notNull(),
}, (table) => [
  index('idx_sync_tombstones_device_clock').on(table.deviceId, table.logicalClock),
  index('idx_sync_tombstones_table_row').on(table.tableName, table.rowId),
]);

/** Last acknowledged cursor per peer device, per direction. */
export const syncCursors = sqliteTable('sync_cursors', {
  peerDeviceId:                   text('peer_device_id').primaryKey().notNull(),
  lastRemoteLogicalClock:         integer('last_remote_logical_clock').notNull().default(0),
  lastAcknowledgedLocalLogicalClock: integer('last_acknowledged_local_logical_clock').notNull().default(0),
  updatedAt:                      text('updated_at').notNull(),
});

/** Singleton row tracking current pairing state and last sync result. */
export const syncState = sqliteTable('sync_state', {
  id:               text('id').primaryKey().notNull().default('local'),
  pairedDesktopId:  text('paired_desktop_id'), // references syncDevices.id
  lastSyncAt:       text('last_sync_at'),
  lastSyncResult:   text('last_sync_result', { enum: ['success', 'failure'] }),
  lastSyncError:    text('last_sync_error'),
  lastRequestId:    text('last_request_id'),
  /** Set once after the first successful sync for this trust period; cleared on re-pair / forget / revoke. */
  firstSuccessfulSyncAt: text('first_successful_sync_at'),
  updatedAt:        text('updated_at').notNull(),
});
