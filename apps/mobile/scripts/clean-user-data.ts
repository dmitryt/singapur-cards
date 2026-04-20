/**
 * Strip user-generated data from a local SQLite DB while keeping canonical
 * language rows and selected app_meta keys (active learning language).
 *
 * Usage:
 *   npm run db:clean
 *   npm run db:clean -- --db /path/to/singapur_cards_mobile.db
 *
 * By default this targets `.data/singapur_cards_mobile.db`, the same file as
 * `npm run db:seed` when using the shared-db workflow (`start:shared-db`).
 * Without `EXPO_PUBLIC_DEV_SQLITE_DIR`, the app uses the sandbox path logged
 * as `[SQLite] database file:` in Metro.
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';

/** Must match `ACTIVE_LEARNING_LANGUAGE_KEY` / `DEFAULT_ACTIVE_LANGUAGE` in the app. */
const ACTIVE_LEARNING_LANGUAGE_KEY = 'active_learning_language';
const DEFAULT_ACTIVE_LANGUAGE = 'en';

/** Language rows kept (migration seeds `en`; add codes you ship as built-in). */
const PRESERVED_LANGUAGE_CODES = new Set<string>(['en']);

/** app_meta rows kept; all other keys are removed. */
const PRESERVED_APP_META_KEYS = new Set<string>([ACTIVE_LEARNING_LANGUAGE_KEY]);

function parseArgs(): { dbPath: string } {
  const args = process.argv.slice(2);
  let dbPath = resolve(process.cwd(), '.data', 'singapur_cards_mobile.db');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && args[i + 1]) {
      dbPath = resolve(args[++i]);
    }
  }
  return { dbPath };
}

function tableExists(sqlite: Database.Database, name: string): boolean {
  const row = sqlite
    .prepare(
      `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(name) as { ok: number } | undefined;
  return row != null;
}

function main(): void {
  const { dbPath } = parseArgs();
  console.log(`Cleaning user data in: ${dbPath}`);

  const sqlite = new Database(dbPath);
  sqlite.pragma('foreign_keys = ON');

  const inList = (codes: Set<string>) =>
    Array.from(codes)
      .map(() => '?')
      .join(', ');

  const langPlaceholders = inList(PRESERVED_LANGUAGE_CODES);
  const metaPlaceholders = inList(PRESERVED_APP_META_KEYS);

  const tx = sqlite.transaction(() => {
    if (tableExists(sqlite, 'sync_changes')) {
      sqlite.prepare('DELETE FROM sync_changes').run();
    }
    if (tableExists(sqlite, 'sync_tombstones')) {
      sqlite.prepare('DELETE FROM sync_tombstones').run();
    }
    if (tableExists(sqlite, 'sync_cursors')) {
      sqlite.prepare('DELETE FROM sync_cursors').run();
    }
    if (tableExists(sqlite, 'sync_state')) {
      sqlite.prepare('DELETE FROM sync_state').run();
    }
    if (tableExists(sqlite, 'sync_devices')) {
      sqlite.prepare('DELETE FROM sync_devices').run();
    }

    sqlite.prepare('DELETE FROM chat_conversations').run();
    sqlite.prepare('DELETE FROM ai_credentials').run();
    sqlite.prepare('DELETE FROM custom_chat_models').run();

    sqlite.prepare('DELETE FROM cards').run();
    sqlite.prepare('DELETE FROM collections').run();
    sqlite.prepare('DELETE FROM dictionaries').run();

    sqlite      .prepare(
        `DELETE FROM app_meta WHERE key NOT IN (${metaPlaceholders})`,
      )
      .run(...PRESERVED_APP_META_KEYS);

    sqlite
      .prepare(
        `DELETE FROM languages WHERE code NOT IN (${langPlaceholders})`,
      )
      .run(...PRESERVED_LANGUAGE_CODES);

    sqlite
      .prepare(
        `UPDATE app_meta SET value = ? WHERE key = ? AND (
          value IS NULL OR TRIM(value) = '' OR value NOT IN (
            SELECT code FROM languages
          )
        )`,
      )
      .run(DEFAULT_ACTIVE_LANGUAGE, ACTIVE_LEARNING_LANGUAGE_KEY);

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO languages (code, title, created_at)
         VALUES (?, 'English', datetime('now'))`,
      )
      .run(DEFAULT_ACTIVE_LANGUAGE);

    const row = sqlite
      .prepare(
        `SELECT 1 AS ok FROM app_meta WHERE key = ? LIMIT 1`,
      )
      .get(ACTIVE_LEARNING_LANGUAGE_KEY) as { ok: number } | undefined;

    if (!row) {
      sqlite
        .prepare(
          `INSERT INTO app_meta (key, value) VALUES (?, ?)`,
        )
        .run(ACTIVE_LEARNING_LANGUAGE_KEY, DEFAULT_ACTIVE_LANGUAGE);
    }
  });

  tx();
  sqlite.close();
  console.log('Done. Preserved languages:', [...PRESERVED_LANGUAGE_CODES].join(', '));
}

main();
