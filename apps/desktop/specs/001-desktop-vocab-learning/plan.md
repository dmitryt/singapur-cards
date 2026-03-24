# Implementation Plan: Desktop Vocabulary Learning MVP

**Branch**: `001-desktop-vocab-learning` | **Date**: 2026-03-20 | **Spec**: [`specs/001-desktop-vocab-learning/spec.md`](./spec.md)
**Input**: Feature specification from `specs/001-desktop-vocab-learning/spec.md`

## Summary

Build a desktop-first, offline vocabulary learning application with Tauri v2. Use Rust for native capabilities, DSL parsing, and local SQLite-backed storage; use React + TypeScript for the UI; keep study state and imported dictionary content local to the device; and organize frontend state with small domain-focused Zustand stores while using Semantic UI React and styled-components for rapid MVP interface delivery.

## Technical Context

**Language/Version**: Rust stable for the Tauri backend, TypeScript 5.x for the React frontend
**Primary Dependencies**: Tauri v2, React, Zustand, styled-components, Semantic UI React, `@tauri-apps/plugin-sql` with SQLite support
**Storage**: SQLite for application data plus app-owned local file storage for imported DSL source files when users choose to retain originals
**Testing**: Rust unit tests for parser, migrations, and search services; Vitest + React Testing Library for UI and store behavior; documented manual smoke checks for startup, import, offline use, and persistence
**Target Platform**: Desktop application for macOS, Windows, and Linux
**Project Type**: Desktop app
**Performance Goals**: 95% of searches return results or an explicit no-results state within 1 second; review interactions feel immediate; importing large dictionaries does not freeze the UI thread
**Constraints**: Fully offline for MVP flows, local-data-safe, keyboard and mouse friendly, able to handle multiple dictionaries up to 200,000 entries each, minimal background processing, no cloud dependency
**Scale/Scope**: Single-user desktop app, multiple imported dictionaries, thousands of saved cards, and enough local content volume to support serious vocabulary study

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate Review

- **Desktop-First Experience**: PASS. The plan uses a native desktop shell, keyboard- and mouse-friendly flows, and a windowed interface with primary actions visible in-app.
- **Local Data Safety**: PASS. Imported content, cards, collections, and review state are stored in application-owned local storage. Destructive actions will require explicit user confirmation.
- **Stable Offline Behavior**: PASS. Search, card creation, collection management, and review all run against local SQLite data with no network dependency.
- **Basic Quality Gates**: PASS. The implementation plan includes automated verification for parser, data, and UI logic plus manual smoke checks for startup and persistence.
- **Keep It Simple**: PASS. The architecture uses one desktop application, one local database, and avoids sync or background services in the MVP.

### Post-Design Gate Review

- **Desktop-First Experience**: PASS. The designed project structure separates desktop shell concerns, domain flows, and local command handling cleanly.
- **Local Data Safety**: PASS. Data model and command contracts keep writes behind explicit commands and lifecycle-controlled migrations.
- **Stable Offline Behavior**: PASS. Contracts and quickstart keep all critical flows local and testable without online services.
- **Basic Quality Gates**: PASS. Research and quickstart document both automated and manual verification paths.
- **Keep It Simple**: PASS. Design remains a single Tauri app with a feature-organized React frontend and a focused Rust backend.

## Project Structure

### Documentation (this feature)

```text
specs/001-desktop-vocab-learning/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── tauri-commands.md     # Phase 1 output
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
│   │   │   ├── dictionary.rs         # import_dictionary, list_dictionaries, remove_dictionary, search_entries, get_entry_detail
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

## Complexity Tracking

No constitution violations or exception justifications are required for this plan.

## Key Design Decisions

### Import progress uses Tauri v2 Channel, not app events

`import_dictionary` accepts an `on_progress: Channel<ImportProgressEvent>` parameter. The Rust importer emits `processedEntries` and `phase` updates at regular intervals during parsing and indexing. The frontend creates the channel before invoking and lets it drop after the command resolves. This satisfies FR-001b (visible progress required) without introducing a global event listener or manual cleanup. Tauri v2 `Channel` is typed, backpressure-safe, and the recommended modern pattern over `app.emit()`.

### Review session ordering is enforced server-side

`start_review_session` orders `sessionCardIds` in Rust before returning: `unreviewed` cards first, then `not_learned`, then `learned`, randomized within each group. The frontend treats the returned slice as an immutable ordered queue and MUST NOT re-sort it. This keeps the ordering logic testable in Rust unit tests rather than buried in UI store logic.

### Cards are immutable copies at creation time

Cards store a snapshot of the dictionary entry. After creation, the card is independent — no foreign key to `entries`. This satisfies II (Local Data Safety) but means cards never auto-update if a dictionary is re-imported with corrections. Acceptable for MVP per spec assumptions.

### `MemoryRouter` over `BrowserRouter`

Tauri serves frontend assets from a custom `tauri://` protocol. History-based routing (`window.location.pathname`) works but requires additional `tauri.conf.json` configuration. `MemoryRouter` works identically across all Tauri versions without configuration.

### Zustand as cache, Rust as source of truth

All mutations: invoke Rust command first → update Zustand state only on success. On cold start: `store.loadCards()` populates the cache from SQLite. This means brief loading states on startup but eliminates any risk of Zustand state diverging from the database.

---

## Artifacts

| File                          | Description                                               |
| ----------------------------- | --------------------------------------------------------- |
| `research.md`                 | Technology decisions with rationale                       |
| `data-model.md`               | SQLite schema, entity definitions, state transitions      |
| `quickstart.md`               | Dev setup, directory structure, Cargo/npm dependencies    |
| `contracts/tauri-commands.md` | All Tauri command signatures (args, return types, errors) |
