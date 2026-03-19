# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> See also the root `CLAUDE.md` for project-wide conventions.

## Status

The implementation has **not yet started**. The `src/` and `src-tauri/src/` directories do not exist yet. All architecture is defined in `specs/001-vocab-learning-app/`.

## Commands

```bash
# Development
cargo tauri dev          # Full dev (Rust + React hot reload)
pnpm dev                 # Frontend only (no Tauri window)

# Testing
cd src-tauri && cargo test                          # All Rust tests
cd src-tauri && cargo test <test_name>              # Single Rust test
cd src-tauri && cargo test db::                     # Tests in a module
pnpm test                                           # All frontend tests (Vitest)
pnpm test -- --run <filename>                      # Single frontend test file

# Checks
cargo clippy             # Rust linting
pnpm tsc --noEmit        # TypeScript type check
```

## Architecture: Data Flow

```
React Component
  → src/lib/tauri/commands.ts  (typed invoke() wrapper)
  → Tauri IPC
  → src-tauri/src/commands/*.rs  (thin async handler, spawn_blocking)
  → src-tauri/src/db/queries.rs  (all SQL here — nowhere else)
  → SQLite (WAL mode, FTS5)
  → success: update Zustand store cache
```

Zustand is a **read cache** — never write to it speculatively. Always invoke Rust first, then update state on success.

## Tauri Command Reference

Full contracts are in `specs/001-vocab-learning-app/contracts/tauri-commands.md`.

**Dictionary**: `search_dictionary`, `import_dictionary` (fire-and-forget, progress via `import-progress` events), `load_dictionaries`, `delete_dictionary`

**Cards**: `save_card` (returns `{ type: 'created' | 'duplicate', card/existingCard }`), `load_cards`, `update_card`, `delete_card`

**Collections**: `create_collection`, `rename_collection`, `delete_collection` (cards survive), `assign_card_to_collection`, `remove_card_from_collection`

**Review**: `start_review_session` (returns shuffled `Card[]`), `end_review_session` (returns `SessionSummary`)

Key TypeScript interfaces: `DictionaryEntry`, `Dictionary`, `Card`, `Collection`, `ReviewSession`, `SessionSummary` — all defined in `contracts/tauri-commands.md`.

## TDD Workflow (NON-NEGOTIABLE)

1. Write the test
2. Get approval before proceeding
3. Confirm it is red (fails)
4. Implement until green

Never write implementation before the test exists and has been confirmed failing.

## Key Spec Files

| File | Purpose |
|------|---------|
| `specs/001-vocab-learning-app/data-model.md` | SQLite schema, table definitions, FTS5 setup |
| `specs/001-vocab-learning-app/contracts/tauri-commands.md` | All Rust command signatures and return types |
| `specs/001-vocab-learning-app/contracts/tauri-events.md` | Rust-to-frontend events (`import-progress`) |
| `specs/001-vocab-learning-app/plan.md` | Implementation plan and task breakdown |
