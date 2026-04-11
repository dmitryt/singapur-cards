/**
 * Development fixture seeder for Singapur Cards (mobile).
 *
 * Populates a local SQLite database with realistic dictionaries, cards,
 * collections, memberships, and review events for local development.
 *
 * Usage:
 *   npm run db:seed
 *   npm run db:seed -- --db /tmp/custom.db
 *   npm run db:seed -- --seed 42
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { faker } from '@faker-js/faker';
import { readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import * as schema from '../src/db/schema';
import {
  aiCredentials,
  cards,
  chatConversations,
  chatMessages,
  collectionMemberships,
  collections,
  customChatModels,
  dictionaries,
  dictionaryEntries,
  languages,
  reviewEvents,
} from '../src/db/schema';

// ── Config ────────────────────────────────────────────────────────────────────

const CARD_COUNT = 30;
const COLLECTION_COUNT = 4;
const ENTRIES_PER_DICT = 20;
const LANG_PAIRS: [string, string][] = [
  ['en', 'de'],
  ['en', 'es'],
  ['de', 'en'],
];
const COLLECTION_NAMES = ['Core Vocabulary', 'Verbs', 'Nouns', 'Daily Use'];

// ── Arg parsing ───────────────────────────────────────────────────────────────

function parseArgs(): { seed: number; dbPath: string } {
  const args = process.argv.slice(2);
  let seed = 12345;
  let dbPath = '/tmp/singapur_mobile_dev.db';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seed' && args[i + 1]) {
      seed = parseInt(args[++i], 10);
    } else if (args[i] === '--db' && args[i + 1]) {
      dbPath = args[++i];
    }
  }
  return { seed, dbPath };
}

// ── Schema bootstrap ──────────────────────────────────────────────────────────

function applySchema(sqlite: Database.Database): void {
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const migrationPath = join(
    __dirname,
    '../src/db/migrations/0000_gigantic_sharon_ventura.sql',
  );
  const sql = readFileSync(migrationPath, 'utf8');

  // Drizzle expo migrations use `--> statement-breakpoint` as a delimiter.
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    sqlite.exec(stmt);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { seed, dbPath } = parseArgs();
  console.log(`Seeding database at: ${dbPath} (seed=${seed})`);

  if (existsSync(dbPath)) rmSync(dbPath);

  const sqlite = new Database(dbPath);
  applySchema(sqlite);

  const db = drizzle(sqlite, { schema });

  faker.seed(seed);

  // ── Languages seed ─────────────────────────────────────────────────────────
  db.insert(languages)
    .values({ code: 'en', title: 'English', createdAt: now() })
    .onConflictDoNothing()
    .run();
  db.insert(languages)
    .values({ code: 'de', title: 'German', createdAt: now() })
    .onConflictDoNothing()
    .run();
  db.insert(languages)
    .values({ code: 'es', title: 'Spanish', createdAt: now() })
    .onConflictDoNothing()
    .run();

  // ── Dictionaries & entries ─────────────────────────────────────────────────
  const allEntries: { id: string; lang: string }[] = [];

  for (let dictIdx = 0; dictIdx < LANG_PAIRS.length; dictIdx++) {
    const [langFrom, langTo] = LANG_PAIRS[dictIdx];
    const dictId = `dict-${dictIdx}`;

    db.insert(dictionaries)
      .values({
        id: dictId,
        name: `${langFrom.toUpperCase()} → ${langTo.toUpperCase()} Dictionary`,
        languageFrom: langFrom,
        languageTo: langTo,
        sourceFilename: `${langFrom}_${langTo}.dsl`,
        importStatus: 'ready',
        entryCount: ENTRIES_PER_DICT,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();

    for (let j = 0; j < ENTRIES_PER_DICT; j++) {
      const headword = faker.word.noun();
      const entryId = `entry-${dictIdx}-${j}`;

      db.insert(dictionaryEntries)
        .values({
          id: entryId,
          dictionaryId: dictId,
          headword,
          normalizedHeadword: headword.toLowerCase(),
          definitionText: faker.lorem.sentence({ min: 3, max: 7 }),
          exampleText: faker.lorem.sentence({ min: 5, max: 12 }),
          sourceOrder: j,
          createdAt: now(),
        })
        .run();

      allEntries.push({ id: entryId, lang: langFrom });
    }
  }

  // ── Collections ────────────────────────────────────────────────────────────
  const collectionIds: string[] = [];

  for (let i = 0; i < COLLECTION_COUNT; i++) {
    const collId = `coll-${i}`;
    const name = COLLECTION_NAMES[i];
    db.insert(collections)
      .values({
        id: collId,
        name,
        description: `A curated set of ${name.toLowerCase()}`,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
    collectionIds.push(collId);
  }

  // ── Cards ──────────────────────────────────────────────────────────────────
  const statuses = ['unreviewed', 'not_learned', 'learned'] as const;
  const cardIds: string[] = [];

  for (let i = 0; i < CARD_COUNT; i++) {
    const cardId = `card-${i}`;
    const status = statuses[i % statuses.length];
    const lang = i % 3 === 2 ? 'de' : 'en';
    const headword = faker.word.noun();
    const date = `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`;

    try {
      db.insert(cards)
        .values({
          id: cardId,
          language: lang,
          headword,
          answerText: faker.lorem.sentence({ min: 2, max: 6 }),
          exampleText: faker.lorem.sentence({ min: 5, max: 12 }),
          sourceEntryIds: JSON.stringify(
            i < allEntries.length ? [allEntries[i].id] : [],
          ),
          learningStatus: status,
          createdAt: date,
          updatedAt: date,
          lastReviewedAt: status !== 'unreviewed' ? '2026-03-01T00:00:00Z' : null,
        })
        .run();
      cardIds.push(cardId);
    } catch {
      console.warn(`  Skipping card-${i} (${headword}): duplicate headword+language`);
    }
  }

  // ── Memberships ────────────────────────────────────────────────────────────
  for (const cardId of cardIds) {
    const numColls = faker.number.int({ min: 0, max: 2 });
    if (numColls === 0) continue;

    const chosen = faker.helpers
      .shuffle([...collectionIds])
      .slice(0, numColls);

    for (const collectionId of chosen) {
      try {
        db.insert(collectionMemberships)
          .values({ collectionId, cardId, createdAt: now() })
          .onConflictDoNothing()
          .run();
      } catch {
        // ignore duplicate memberships
      }
    }
  }

  // ── Review events ──────────────────────────────────────────────────────────
  const reviewResults = ['learned', 'not_learned'] as const;
  let eventIdx = 0;

  for (const cardId of cardIds) {
    if (!faker.datatype.boolean(0.6)) continue;

    db.insert(reviewEvents)
      .values({
        id: `review-${eventIdx}`,
        cardId,
        result: reviewResults[eventIdx % reviewResults.length],
        reviewedAt: '2026-03-01T00:00:00Z',
      })
      .run();
    eventIdx++;
  }

  // ── AI credentials (one fixture entry) ────────────────────────────────────
  db.insert(aiCredentials)
    .values({
      id: 'cred-0',
      provider: 'openai',
      label: 'Dev key',
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    })
    .onConflictDoNothing()
    .run();

  // ── Chat fixtures ──────────────────────────────────────────────────────────
  db.insert(chatConversations)
    .values({
      id: 'conv-0',
      title: 'Vocabulary help',
      model: 'gpt-4o',
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  db.insert(chatMessages)
    .values([
      {
        id: 'msg-0',
        conversationId: 'conv-0',
        role: 'user',
        body: 'What does "Schadenfreude" mean?',
        createdAt: now(),
      },
      {
        id: 'msg-1',
        conversationId: 'conv-0',
        role: 'assistant',
        body: faker.lorem.paragraph(),
        createdAt: now(),
      },
    ])
    .run();

  // ── Custom models ──────────────────────────────────────────────────────────
  db.insert(customChatModels)
    .values({
      id: 'model-0',
      name: 'gpt-4o-mini',
      title: 'GPT-4o Mini',
      provider: 'openai',
      createdAt: now(),
    })
    .onConflictDoNothing()
    .run();

  sqlite.close();

  console.log(`✓ Seeded ${LANG_PAIRS.length} dictionaries (${ENTRIES_PER_DICT} entries each)`);
  console.log(`✓ Seeded ${COLLECTION_COUNT} collections`);
  console.log(`✓ Seeded ${cardIds.length} cards`);
  console.log(`✓ Seeded ${eventIdx} review events`);
  console.log(`\nDatabase ready at: ${dbPath}`);
  console.log('Run with --seed <N> to reproduce this exact dataset.');
}

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
