# Implementation Plan: Vocabulary Learning Desktop App

**Branch**: `001-vocab-learning-app` | **Date**: 2026-03-19 | **Spec**: `apps/desktop/specs/001-vocab-learning-app/spec.md`
**Input**: Feature specification — Full-featured vocabulary learning desktop app with DSL dictionary import, word search, card creation, collections, and flip-card review mode.

---

## Summary

Build a fully offline Tauri v2 desktop application for vocabulary learning. Users import ABBYY Lingvo DSL dictionaries, search entries in real time via SQLite FTS5, save entries as independent flashcards, organize them into collections, and review via a flip-card UI. The Rust core handles all data access and DSL parsing; the React/TypeScript frontend is a pure view layer.

---

## Technical Context

**Language/Version**: Rust 1.75+ (Tauri v2 backend), TypeScript 5.x (React 18 frontend)
**Primary Dependencies**: Tauri v2, React 18, Zustand 5, styled-components v6, semantic-ui-react 3 + semantic-ui-css, rusqlite 0.31 (bundled + fts5), r2d2 + r2d2_sqlite, encoding_rs, nom 7, react-router-dom v6
**Storage**: SQLite with FTS5 — `rusqlite` with `bundled` feature (guaranteed FTS5 on macOS and Windows)
**Testing**: `cargo test` (Rust core), Vitest + @testing-library/react (frontend)
**Target Platform**: macOS and Windows desktop (Tauri v2)
**Project Type**: Desktop app
**Performance Goals**: Search < 500ms for 500k entries (SC-001); import progress visible within 1s for files > 5MB (SC-002); app remains responsive during import (SC-005)
**Constraints**: Fully offline (FR-017); single user; all data local (FR-018); cards survive dictionary deletion (FR-009)
**Scale/Scope**: Single user, local SQLite, MVP feature set

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design below.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Desktop-First | PASS | Tauri v2 native desktop; SQLite local storage; all features work offline (FR-017/FR-018) |
| II. Component Isolation | PASS | Rust core owns all business logic + SQLite; React frontend is pure view layer; Zustand is a cache/view, not source of truth |
| III. Test-First | PASS | `cargo test` for Rust core; Vitest + Testing Library for React; TDD workflow documented in `quickstart.md` |
| IV. Simplicity | PASS | SQLite over a DB server; Zustand over Redux; MVP scope enforced (no sync, no audio, no SRS) |
| V. Data Integrity | PASS | Cards are independent copies after creation (FR-009); destructive ops (delete dictionary, delete card) require explicit user confirmation; SQLite WAL + transactions |

**Post-design re-check**: No violations introduced. Connection pool (`r2d2`) adds justified complexity: required to meet SC-005 (responsive during import) — single `Mutex<Connection>` would block search while import runs.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-vocab-learning-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── tauri-commands.md   # Phase 1 output
│   └── tauri-events.md     # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code

```text
apps/desktop/
├── src/                              # React frontend
│   ├── components/
│   │   ├── atoms/                    # Thin wrappers / extensions of Semantic UI React primitives (Button, Input, Label, Loader, Progress)
│   │   ├── molecules/                # SearchBar, SearchResultCard, FlashCardTile, CollectionBadge, CollectionForm, ReviewControls
│   │   ├── organisms/                # SearchResultList, CardGrid, CardDetail, CollectionList, FlipCard, SessionStats, Sidebar
│   │   └── templates/                # AppShell, PageContainer
│   ├── pages/
│   │   ├── SearchPage.tsx
│   │   ├── LibraryPage.tsx
│   │   ├── CollectionsPage.tsx
│   │   └── ReviewPage.tsx
│   ├── store/
│   │   ├── index.ts                  # Single create() with StateCreator slices
│   │   └── slices/
│   │       ├── dictionarySlice.ts    # Ephemeral search + import state
│   │       ├── cardSlice.ts          # Cards + collections (cache of Rust DB)
│   │       └── reviewSessionSlice.ts # Ephemeral review session state
│   ├── lib/
│   │   └── tauri/
│   │       └── commands.ts           # All invoke() wrappers — typed, never in components
│   ├── theme/
│   │   ├── theme.ts                  # Single typed theme constant
│   │   ├── styled.d.ts               # DefaultTheme augmentation
│   │   └── GlobalStyles.ts
│   ├── test/
│   │   ├── setup.ts
│   │   └── __mocks__/@tauri-apps/api/core.ts
│   ├── App.tsx                       # MemoryRouter + ThemeProvider + AppShell
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs             # DDL + migration runner
│   │   │   └── queries.rs            # All SQL — no inline SQL elsewhere
│   │   ├── dsl/
│   │   │   ├── mod.rs
│   │   │   ├── parser.rs             # Line-by-line state machine + nom tag parser
│   │   │   └── importer.rs           # Streaming import + progress callback
│   │   ├── commands/
│   │   │   ├── dictionary.rs         # search_dictionary, import_dictionary, load_dictionaries, delete_dictionary
│   │   │   ├── cards.rs              # save_card, load_cards, update_card, delete_card
│   │   │   ├── collections.rs        # create/rename/delete_collection, assign/remove card
│   │   │   └── review.rs             # start_review_session, end_review_session
│   │   ├── models.rs                 # Shared serializable structs
│   │   ├── state.rs                  # DbPool + AppState
│   │   └── main.rs
│   ├── tests/
│   │   ├── dsl_parser_tests.rs       # Parser unit tests with fixture files
│   │   └── db_integration_tests.rs   # Full DB round-trips on tempfile DBs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── vite.config.ts
├── tsconfig.json
└── package.json
```

**Structure Decision**: Tauri v2 monorepo layout within the `apps/desktop` workspace. Rust in `src-tauri/`, React in `src/`. No separate `backend/frontend` split — Tauri's convention co-locates both.

---

## Complexity Tracking

| Justified Addition | Why Needed | Simpler Alternative Rejected Because |
|-------------------|------------|--------------------------------------|
| `r2d2` connection pool | SC-005: app must stay responsive during import | Single `Mutex<Connection>` blocks all reads while write-heavy import runs on the single connection |
| FTS5 virtual table (in addition to `entries` table) | SC-001: < 500ms search on 500k entries | LIKE queries on plain `entries.headword` are 2–10s on large datasets; FTS5 prefix index is the only viable path |
| `encoding_rs` dependency | DSL files may be UTF-16 LE | Rust `std` has no UTF-16 decoder; this is a one-dependency solution to a real requirement |
| `semantic-ui-react` + `semantic-ui-css` | Pre-built accessible UI components (forms, modals, labels, progress, cards) avoids building atoms from scratch | Hand-rolling `styled-components` primitives for each atom adds significant churn with no UX benefit for an MVP; Semantic UI ships keyboard-accessible components by default |

---

## Key Design Decisions

### Cards are immutable copies at creation time

Cards store a snapshot of the dictionary entry. After creation, the card is independent — no foreign key to `entries`. This satisfies FR-009 and V (Data Integrity) but means cards never auto-update if a dictionary is re-imported with corrections. Acceptable for MVP per spec assumptions.

### FTS rebuild strategy

During bulk import, FTS triggers are suspended and `INSERT INTO entries_fts(entries_fts) VALUES('rebuild')` is called once after all entries are committed. This is 10–50x faster than per-row trigger inserts for large files. The downside (search returns stale results during import) is acceptable because: (a) newly imported dictionaries aren't being searched yet, and (b) SC-005 only requires the UI to remain interactive, not that new entries be searchable mid-import.

### `MemoryRouter` over `BrowserRouter`

Tauri serves frontend assets from a custom `tauri://` protocol. History-based routing (`window.location.pathname`) works but requires additional `tauri.conf.json` configuration. `MemoryRouter` works identically across all Tauri versions without configuration.

### Zustand as cache, Rust as source of truth

All mutations: invoke Rust command first → update Zustand state only on success. On cold start: `store.loadCards()` populates the cache from SQLite. This means brief loading states on startup but eliminates any risk of Zustand state diverging from the database.

---

## Artifacts

| File | Description |
|------|-------------|
| `research.md` | Technology decisions with rationale |
| `data-model.md` | SQLite schema, entity definitions, state transitions |
| `quickstart.md` | Dev setup, directory structure, Cargo/npm dependencies |
| `contracts/tauri-commands.md` | All Tauri command signatures (args, return types, errors) |
| `contracts/tauri-events.md` | All Rust-to-frontend event payloads |
