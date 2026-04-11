## Context

The mobile app uses `expo-sqlite` with a migration runner in `src/db/migrate.ts`. Currently only one migration exists: `v1` creates an `app_meta` placeholder table. The desktop app (`apps/desktop`) defines the canonical schema in `schema.rs` and `docs/data/sql-schemas.md`. The mobile client needs the same tables to store and query real application data.

## Goals / Non-Goals

**Goals:**
- Add a single new migration (`v2`) to `MIGRATIONS` that creates all canonical tables and indexes
- Apply `PRAGMA foreign_keys=ON` and `PRAGMA journal_mode=WAL` in `src/db/index.ts` at open time
- Seed the `languages` table with `en`/`English`

**Non-Goals:**
- Implementing query helpers, repositories, or data-access layer
- Syncing data between desktop and mobile (network/API layer)
- Full-text search on mobile (`dictionary_entries_fts` + FTS triggers are excluded — expo-sqlite does not ship FTS5 by default)

## Decisions

### Single migration vs. one per table
**Decision**: One migration (`v2`) containing all table DDL in dependency order (no foreign-key violations).

**Rationale**: The tables are being introduced together with no existing mobile data to preserve. A single atomic migration is simpler to reason about, easier to roll back (drop everything), and avoids partial states where some tables exist but foreign-key targets don't.

**Alternative**: One migration per table — rejected because it adds unnecessary index bookkeeping with zero benefit at this stage.

### No FTS5 on mobile
**Decision**: Skip `dictionary_entries_fts` virtual table and its sync triggers.

**Rationale**: `expo-sqlite` bundles SQLite without the FTS5 extension on most platforms. Adding it would require a custom native build. Dictionary search on mobile can use `LIKE` or `normalized_headword` index queries until FTS is explicitly prioritized.

### PRAGMAs at open time
**Decision**: Apply `PRAGMA foreign_keys=ON` and `PRAGMA journal_mode=WAL` in `src/db/index.ts` immediately after `openDatabaseSync`.

**Rationale**: PRAGMAs are per-connection settings and must be applied before any queries run. WAL mode improves concurrent read performance; `foreign_keys=ON` enforces referential integrity at runtime.

## Risks / Trade-offs

- **`app_meta` table from v1 is not in the canonical schema** → Keep it; it's harmless and removing it would require a separate drop migration. Can be cleaned up later.
- **`ai_credentials` stores provider keys without encryption** → Acceptable for now; encryption is a separate security concern out of scope here.
- **Migration v2 is large** → If it fails mid-way, `withTransactionAsync` rolls the entire migration back cleanly.

## Migration Plan

1. Append `v2` SQL block to `MIGRATIONS` in `src/db/migrate.ts`
2. Add PRAGMAs to `src/db/index.ts`
3. On next app launch the migration runner detects version -1 < 1 (v2 index) and applies it atomically
4. **Rollback**: Not applicable for new installs. For dev devices, delete the database file and reinstall.
