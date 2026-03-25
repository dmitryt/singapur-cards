# Tasks: Desktop Vocabulary Learning MVP

**Input**: Design documents from `specs/001-desktop-vocab-learning/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/tauri-commands.md, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
**Tests**: Rust unit/integration tests are included per quickstart.md and research.md Decision 6. Vitest UI tests are included for store slices.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Tauri v2 monorepo, install dependencies, and configure tooling so the app window opens and the dev environment is stable.

- [ ] T001 Bootstrap React + TypeScript frontend in `src/` with Vite — create `package.json`, `vite.config.ts`, `tsconfig.json`
- [ ] T002 Initialize Tauri v2 backend in `src-tauri/` — create `Cargo.toml` with `tauri`, `tauri-plugin-sql`, `tauri-plugin-dialog`, `serde`, `serde_json`, `uuid` dependencies and `tauri.conf.json`
- [ ] T003 [P] Install and configure frontend dependencies: `react`, `react-dom`, `react-router-dom` (MemoryRouter), `zustand`, `styled-components`, `semantic-ui-react`, `fomantic-ui-css`, `@tauri-apps/plugin-dialog`
- [ ] T004 [P] Install and configure test toolchain: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@vitest/coverage-v8` — create `src/test/setup.ts`
- [ ] T005 [P] Create Tauri mock for tests in `src/test/__mocks__/@tauri-apps/api/core.ts`
- [ ] T006 [P] Configure Tauri v2 capabilities in `src-tauri/capabilities/` — grant `dialog:allow-open` (native file picker), `fs:allow-read` scoped to user-selected paths only, and `sql:allow-execute` / `sql:allow-select` for app data dir; no broader filesystem access
- [ ] T007 [P] Set up `src/theme/theme.ts` (typed theme constant), `src/theme/styled.d.ts` (DefaultTheme augmentation), `src/theme/GlobalStyles.ts`

**Checkpoint**: `npm run tauri dev` opens the desktop window; `npm test` and `cargo test` execute without errors

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Rust/frontend boundaries that ALL user stories depend on — SQLite schema, migration runner, shared models, AppState, contract-aligned command wrappers, and the app shell skeleton.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T008 Create SQLite DDL and migration runner in `src-tauri/src/db/schema.rs` (including `src-tauri/src/db/mod.rs`) — on first run, create every required schema object if missing using idempotent `CREATE TABLE IF NOT EXISTS` / `CREATE VIRTUAL TABLE IF NOT EXISTS` semantics; tables: `dictionaries`, `dictionary_entries`, `dictionary_entries_fts` (FTS5 on `normalized_headword`), `cards`, `collections`, `collection_memberships`, `review_events`; add `cards.language`, persist `cards.source_entry_ids`, and enforce a unique index on `cards(headword, language)`
- [ ] T009 [P] Create shared serializable Rust structs in `src-tauri/src/models.rs` — `Dictionary`, `DictionaryEntry`, `HeadwordDetail`, `Card`, `Collection`, `ReviewEvent`, `CommandSuccess<T>`, `CommandFailure`, `ConflictFailure`, `ImportProgressEvent`
- [ ] T010 [P] Create `AppState` and `DbPool` in `src-tauri/src/state.rs` — on app startup, open or create the SQLite database in the app data dir, run migrations before serving commands, and guarantee all required tables exist on first launch
- [ ] T011 Create the initial SQL query layer in `src-tauri/src/db/queries.rs` — shared DB helpers plus dictionary/search queries for `dictionaries`, `dictionary_entries`, and `dictionary_entries_fts`; story-specific card/collection/review queries should be added alongside those backend tasks; no inline SQL elsewhere in codebase (depends on T008, T009)
- [ ] T012 Wire `AppState` to `main.rs` — register every planned command handler with initial `CommandFailure { code: NOT_FOUND }` stubs and manage plugin initialization in `src-tauri/src/main.rs` (depends on T010)
- [ ] T013 [P] Align `specs/001-desktop-vocab-learning/contracts/tauri-commands.md` with backend-owned aggregated `HeadwordDetail` behavior and MVP `search_headwords` match kinds (`exact`, `prefix`), then create typed `invoke()` wrappers for all Tauri commands in `src/lib/tauri/commands.ts`
- [ ] T014 [P] Create `src/App.tsx` with `MemoryRouter` + `ThemeProvider` + `AppShell` skeleton and `src/main.tsx` entry point
- [ ] T015 [P] Create `src/components/templates/AppShell.tsx` and `src/components/templates/PageContainer.tsx`

**Checkpoint**: App boots on a clean first run, creates the SQLite file and all required tables automatically in the app data dir, repeated launches remain safe when tables already exist, and all command stubs return `CommandFailure` with `NOT_FOUND`

---

## Phase 3: User Story 1 — Import and Search Dictionaries (Priority: P1) MVP

**Goal**: Users can import a DSL dictionary file, see live import progress, and search headwords by source language with exact/prefix matching.

**Independent Test**: Import a valid DSL file → dictionary appears in list with correct language pair and non-zero `entryCount` → search finds exact + prefix matches → opening a result navigates to a dedicated headword-detail page that renders aggregated detail for that headword — all without network access.

### Rust backend — US1

- [ ] T016 [P] [US1] Implement DSL line-by-line state machine in `src-tauri/src/dsl/parser.rs` (including `src-tauri/src/dsl/mod.rs`) — handle headword lines, tag-stripped definition lines, example lines, multi-entry headwords, and skip/count malformed blocks
- [ ] T017 [P] [US1] Write Rust unit tests for DSL parser with fixture files in `src-tauri/tests/dsl_parser_tests.rs` — cover valid entries, multi-headword, partial/malformed blocks, fully corrupt input
- [ ] T018 [US1] Implement streaming importer in `src-tauri/src/dsl/importer.rs` — reads file, calls parser, emits `ImportProgressEvent` via `Channel` every 500 parsed entries, returns `(entryCount, skippedEntryCount, warnings)` (depends on T016)
- [ ] T019 [US1] Implement `import_dictionary` command in `src-tauri/src/commands/dictionary.rs` (including `src-tauri/src/commands/mod.rs`) — accepts `ImportDictionaryInput` + `on_progress: Channel<ImportProgressEvent>`, reads the user-selected file once, writes normalized content plus source metadata to `dictionaries` + `dictionary_entries`, updates `import_status` lifecycle, returns `ImportDictionaryOutput` (depends on T011, T018)
- [ ] T020 [P] [US1] Implement `list_dictionaries` command in `src-tauri/src/commands/dictionary.rs`
- [ ] T021 [P] [US1] Implement `remove_dictionary` command in `src-tauri/src/commands/dictionary.rs` — cascade-deletes entries and FTS index rows
- [ ] T022 [US1] Implement `search_headwords` command in `src-tauri/src/commands/dictionary.rs` — FTS5 query on `normalized_headword`, filter by `searchLanguage` / `dictionaryIds`, group results by `headword + language`, return `matchKind` (`exact` / `prefix`) for the MVP, and respect `limit` (depends on T011)
- [ ] T023 [US1] Implement backend-owned aggregated `get_headword_detail` command in `src-tauri/src/commands/dictionary.rs` — accept a selected `headword + language`, resolve sibling entries that share that grouped identity, and return structured `HeadwordDetail` in one response for the dedicated detail page (depends on T011)
- [ ] T024 [US1] Write Rust DB integration tests for import + search in `src-tauri/tests/db_integration_tests.rs` — round-trip on temp SQLite: import → list → grouped search → aggregated `get_headword_detail` (depends on T019, T022, T023)

### Frontend — US1
- [ ] T025 [P] [US1] Create `dictionarySlice.ts` in `src/store/slices/dictionarySlice.ts` — state: `dictionaries[]`, `importProgress`, `importStatus`, `searchQuery`, `searchLanguage`, `searchResults`, `selectedHeadword`, `headwordDetail`; actions: `loadDictionaries`, `importDictionary`, `removeDictionary`, `searchHeadwords`, `selectHeadword`, `getHeadwordDetail`, `clearHeadwordDetail`
- [ ] T026 [P] [US1] Create Zustand store root in `src/store/index.ts` — single `create()` with `StateCreator` slice composition
- [ ] T027 [US1] Build `SearchBar` molecule in `src/components/molecules/SearchBar.tsx` — debounced input + language selector dropdown (depends on T025)
- [ ] T028 [US1] Build `SearchResultCard` molecule in `src/components/molecules/SearchResultCard.tsx` — headword, matchKind badge, previewText
- [ ] T029 [US1] Build `SearchResultList` organism in `src/components/organisms/SearchResultList.tsx` — renders list of `SearchResultCard`, empty state, loading state
- [ ] T030 [US1] Build `DictionaryManager` organism in `src/components/organisms/DictionaryManager.tsx` — list imported dictionaries, import button, remove with confirmation modal, progress bar during import (uses Tauri Channel via `commands.ts`)
- [ ] T031 [US1] Build `SearchPage.tsx` in `src/pages/SearchPage.tsx` — composes `DictionaryManager`, `SearchBar`, and `SearchResultList`; on result selection, navigate to the dedicated headword-detail route instead of rendering detail inline; wire grouped search interactions to `dictionarySlice` (depends on T027–T030)
- [ ] T032 [US1] Build `HeadwordDetailPage.tsx` in `src/pages/HeadwordDetailPage.tsx` — call aggregated `get_headword_detail` once per route entry, render backend-combined `HeadwordDetail` in a structured layout, and expose the "Save as Card" action from this page (depends on T023, T025)
- [ ] T033 [US1] Wire search-result navigation and route-param-driven detail loading between `SearchPage.tsx`, `HeadwordDetailPage.tsx`, and `dictionarySlice.ts` so `HeadwordDetail` is route-owned rather than client-side fan-out state (depends on T031, T032)
- [ ] T034 [US1] Wire `SearchPage` and `HeadwordDetailPage` into `AppShell` routing in `src/App.tsx`

**Checkpoint**: User Story 1 fully functional — import → progress → search → dedicated headword-detail page, offline, persists across restarts. Run `cargo test` (T017, T024) before advancing.

---

## Phase 4: User Story 2 — Save Words as Study Cards (Priority: P2)

**Goal**: Users can create a card from a dictionary entry (prefilled), edit fields, and save it to the local library.

**Independent Test**: Open an entry → create card → card prefilled with entry data → edit translation → save → card appears in LibraryPage → restart app → card still present.

### Rust backend — US2

- [ ] T035 [P] [US2] Implement `create_card_from_headword_detail` command in `src-tauri/src/commands/cards.rs` and supporting card insert/membership query helpers in `src-tauri/src/db/queries.rs` — inserts `Card` row with `language` and `source_entry_ids`, returns `CreateCardFromHeadwordDetailOutput`; on duplicate `headword + language` returns `ConflictFailure` with `existingCardId`
- [ ] T036 [P] [US2] Implement `update_card` command in `src-tauri/src/commands/cards.rs` and supporting card-update/membership-sync query helpers in `src-tauri/src/db/queries.rs` — updates mutable card fields, replaces collection memberships, sets `updated_at`
- [ ] T037 [P] [US2] Implement `get_card` command in `src-tauri/src/commands/cards.rs` and supporting lookup query helpers in `src-tauri/src/db/queries.rs` — returns full `GetCardOutput` by `cardId`
- [ ] T038 [P] [US2] Implement `list_cards` command in `src-tauri/src/commands/cards.rs` and supporting filter query helpers in `src-tauri/src/db/queries.rs` — filters by optional `collectionId` and/or `learningStatus`
- [ ] T039 [P] [US2] Implement `delete_card` command in `src-tauri/src/commands/cards.rs` and supporting delete query helpers in `src-tauri/src/db/queries.rs` — deletes card and its `collection_memberships`

### Frontend — US2

- [ ] T040 [P] [US2] Create `cardSlice.ts` in `src/store/slices/cardSlice.ts` — state: `cards[]`, `activeCard`; actions: `loadCards`, `createCard`, `updateCard`, `getCard`, `deleteCard`; Zustand is a cache — mutate Rust first, update store on success
- [ ] T041 [US2] Build `CardDetail` organism in `src/components/organisms/CardDetail.tsx` — editable form for headword, answerText, exampleText, notes, audioReference; save/cancel/delete actions with explicit confirmation on delete (depends on T040)
- [ ] T042 [US2] Build `FlashCardTile` molecule in `src/components/molecules/FlashCardTile.tsx` — compact card showing headword, answerText preview, learningStatus badge; then build `LibraryPage.tsx` in `src/pages/LibraryPage.tsx` using `FlashCardTile` for the card grid, with status filter, `CardDetail` panel, and a clear extension point for later `collectionSlice`-driven filtering (depends on T040)
- [ ] T043 [US2] Wire "Save as Card" action from `HeadwordDetailPage` — calls `create_card_from_headword_detail`; on `ConflictFailure` navigate to `existingCardId` card (depends on T035, T041)
- [ ] T044 [US2] Wire `LibraryPage` into `AppShell` routing in `src/App.tsx` (depends on T042)

**Checkpoint**: User Stories 1 + 2 both independently functional. Run `cargo test` — parser and DB integration tests from T017 and T024 must pass; card DB round-trips including duplicate-card conflict handling will be covered by T067 in Phase 7 (constitution §IV).

---

## Phase 5: User Story 4 — Organize Cards into Collections (Priority: P2)

**Goal**: Users can create named collections, assign cards to them, and filter the card library by collection.

**Independent Test**: Create collection → assign card → card appears in collection → rename collection → cards unaffected → delete collection → cards still in general library.

### Rust backend — US4

- [ ] T045 [P] [US4] Implement `create_collection` command in `src-tauri/src/commands/collections.rs` and supporting insert query helpers in `src-tauri/src/db/queries.rs`
- [ ] T046 [P] [US4] Implement `list_collections` command in `src-tauri/src/commands/collections.rs` and supporting aggregate query helpers in `src-tauri/src/db/queries.rs` — includes `cardCount` from `collection_memberships`
- [ ] T047 [P] [US4] Implement `rename_collection` command in `src-tauri/src/commands/collections.rs` and supporting update query helpers in `src-tauri/src/db/queries.rs`
- [ ] T048 [US4] Implement `delete_collection` command in `src-tauri/src/commands/collections.rs` and supporting delete query helpers in `src-tauri/src/db/queries.rs` — deletes collection + memberships only; cards remain in library (depends on T045)

### Frontend — US4

- [ ] T049 [US4] Create `collectionSlice.ts` in `src/store/slices/collectionSlice.ts` — state: `collections[]`, `selectedCollectionId`; actions: `loadCollections`, `createCollection`, `renameCollection`, `deleteCollection`, `selectCollection`
- [ ] T050 [P] [US4] Build `CollectionBadge` molecule in `src/components/molecules/CollectionBadge.tsx` — visual label showing collection name; then build `CollectionForm` molecule in `src/components/molecules/CollectionForm.tsx` — multi-select collection assignment widget backed by `collectionSlice`, for use in `CardDetail`
- [ ] T051 [US4] Build `CollectionList` organism in `src/components/organisms/CollectionList.tsx` — list with card count, rename inline, delete with confirmation; wire collection CRUD through `collectionSlice`
- [ ] T052 [US4] Build `CollectionsPage.tsx` in `src/pages/CollectionsPage.tsx` — manage collections, set the active collection filter, and sync it with `LibraryPage` via `collectionSlice` (depends on T049, T051)
- [ ] T053 [US4] Add collection selector to `CardDetail` in `src/components/organisms/CardDetail.tsx` using `CollectionForm` and persist memberships through `update_card` `collectionIds` updates (depends on T040, T049, T050)
- [ ] T054 [US4] Wire `CollectionsPage` into `AppShell` routing in `src/App.tsx`

**Checkpoint**: User Stories 1, 2, and 4 all independently functional; collections filter library correctly. Run `cargo test` — existing parser and import tests must pass; collection and card DB round-trips will be covered by T067 in Phase 7 (constitution §IV).

---

## Phase 6: User Story 3 — Review Saved Cards (Priority: P3)

**Goal**: Users can start a review session, flip cards front→back, and mark each as learned or not learned, with status persisting across restarts.

**Independent Test**: Save >=1 card → start review → cards arrive in order (unreviewed first, not_learned, learned, random within group) → flip card → mark learned/not_learned → restart app → updated status visible in library and next review session.

### Rust backend — US3

- [ ] T055 [P] [US3] Implement `start_review_session` command in `src-tauri/src/commands/review.rs` and supporting session query helpers in `src-tauri/src/db/queries.rs` — queries cards (filtered by optional `collectionId`), returns `sessionCardIds` ordered server-side: `unreviewed → not_learned → learned`, randomized within each group
- [ ] T056 [P] [US3] Implement `record_review_result` command in `src-tauri/src/commands/review.rs` and supporting write query helpers in `src-tauri/src/db/queries.rs` — inserts `ReviewEvent` row, updates `Card.learning_status` and `last_reviewed_at`

### Frontend — US3

- [ ] T057 [P] [US3] Create `reviewSessionSlice.ts` in `src/store/slices/reviewSessionSlice.ts` — state: `sessionCardIds[]`, `currentIndex`, `isFlipped`, `sessionComplete`; actions: `startSession`, `flipCard`, `recordResult`, `advance`; treat `sessionCardIds` as an immutable ordered queue — MUST NOT re-sort
- [ ] T058 [US3] Build `FlipCard` organism in `src/components/organisms/FlipCard.tsx` — renders card front (headword) and back (answerText + exampleText); flip animation (depends on T057)
- [ ] T059 [US3] Build `ReviewControls` molecule in `src/components/molecules/ReviewControls.tsx` — "Learned" / "Not Learned" buttons + progress indicator
- [ ] T060 [P] [US3] Build `SessionStats` organism in `src/components/organisms/SessionStats.tsx` — review session end summary (total reviewed, learned count, not-learned count); used by `ReviewPage`
- [ ] T061 [US3] Build `ReviewPage.tsx` in `src/pages/ReviewPage.tsx` — composes `FlipCard` + `ReviewControls`; handles empty-collection state; shows session completion via `SessionStats` organism (depends on T057–T060)
- [ ] T062 [US3] Wire `ReviewPage` into `AppShell` routing in `src/App.tsx`

**Checkpoint**: Full MVP loop functional — import → search → create card → organize → review → persist. Run `cargo test` to verify review command round-trips (covered by T067; constitution §IV).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Navigation plumbing, error surfaces, remaining tests, and quickstart validation.

- [ ] T063 Implement full `AppShell` navigation/sidebar in `src/components/templates/AppShell.tsx` — links to Search, Library, Collections, Review pages; active-route highlighting; keep the dedicated headword-detail route grouped under the Search navigation state; correct Tab focus order, Escape closes open modals/panels, Enter submits forms (constitution §I keyboard requirement)
- [ ] T064 [P] Build reusable `atoms/` wrappers in `src/components/atoms/` — `Button`, `Input`, `Label`, `Loader`, `Progress` as thin typed wrappers over Semantic UI React primitives
- [ ] T065 [P] Add empty-state and error-boundary components in `src/components/organisms/` — covers: no dictionaries, no search results, no cards, no collections
- [ ] T066 [P] Write Vitest coverage for all Zustand store slices plus page-level happy-path tests for `SearchPage`, `HeadwordDetailPage` (`HeadwordDetail`), `LibraryPage`, `CollectionsPage`, and `ReviewPage` in `src/test/` — mock Tauri commands via `src/test/__mocks__/@tauri-apps/api/core.ts`
- [ ] T067 [P] Extend `src-tauri/tests/db_integration_tests.rs` — add round-trips for cards (create/update/delete/conflict), collections (create/rename/delete/membership), and review (start_session ordering + record_result)
- [ ] T068 [P] Add a development-only fixture seeding CLI in `src-tauri/Cargo.toml`, `src-tauri/src/dev/fixtures.rs`, `src-tauri/src/bin/seed_dev_db.rs`, and `package.json` — populate SQLite with realistic dictionaries, cards, collections, memberships, and review events for local development using `fake-rs`; support deterministic seeding via an explicit seed argument
- [ ] T069 Run quickstart.md manual smoke test checklist and confirm all 10 steps pass
- [ ] T070 Benchmark search against a 200,000-entry SQLite database — verify p95 response time < 1 second on a typical consumer desktop machine (SC-001); document result in quickstart.md or a perf note. **Pass/fail gate**: if p95 > 1 s, open a follow-up task to optimize FTS5 indexing (e.g., trigram tokenizer, query plan tuning) before release.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; tasks T001–T007 can all run in parallel after T001/T002
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — blocks ALL user story phases
- **Phase 3 (US1)**: Depends on Phase 2 — highest priority, start first
- **Phase 4 (US2)**: Depends on Phase 2 — can start after Phase 2 or overlap with Phase 3
- **Phase 5 (US4)**: Depends on Phase 4 (cards must exist before collection assignment)
- **Phase 6 (US3)**: Depends on Phase 2 — backend/session work can begin after Phase 2, but end-to-end validation depends on Phase 4 because review needs saved cards
- **Phase 7 (Polish)**: Depends on all desired story phases complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2 — independent of US2/US3/US4
- **US2 (P2)**: Depends on the US1 dedicated entry-detail flow for the primary "save from dictionary" path; backend card CRUD can start once Phase 2 is complete
- **US4 (P2)**: Depends on US2 (cards must be creatable before collection assignment)
- **US3 (P3)**: Backend review plumbing can start after Phase 2, but end-to-end story completion depends on US2 because review requires saved cards; collection-filtered review also benefits from US4

### Within Each Phase

- Rust backend tasks before frontend tasks within a story (commands must exist to mock/stub)
- Models/queries before command handlers
- Store slices before page components
- Search page before entry-detail navigation wiring; page components before routing wire-up

### Parallel Opportunities

- All `[P]` tasks within a phase can run simultaneously
- Rust backend tasks (T016–T024) and frontend store setup (T025–T026) within US1 can run in parallel once T013 locks the contract shape
- US1 backend and US2 backend can overlap once Phase 2 is complete

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, launch simultaneously:
Task T016: "Implement DSL parser in src-tauri/src/dsl/parser.rs"
Task T017: "Write parser unit tests in src-tauri/tests/dsl_parser_tests.rs"
Task T020: "Implement list_dictionaries in src-tauri/src/commands/dictionary.rs"
Task T021: "Implement remove_dictionary in src-tauri/src/commands/dictionary.rs"
Task T025: "Create dictionarySlice.ts in src/store/slices/dictionarySlice.ts"
Task T026: "Create store root in src/store/index.ts"

# Then, after T016 completes:
Task T018: "Implement streaming importer in src-tauri/src/dsl/importer.rs"

# Then, after T018 + T011:
Task T019: "Implement import_dictionary command"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (import + search)
4. **STOP and VALIDATE**: import a real DSL file, search for words, open the dedicated headword-detail page offline
5. Demo / share — the core product loop is already useful

### Incremental Delivery

1. Setup + Foundational → project boots, migrations run
2. US1 → dictionary import + search
3. US2 → card creation + library
4. US4 → collections
5. US3 → review mode
6. Polish + dev seeding CLI → complete the product and speed up local QA/perf validation

### Total Task Count

- Phase 1 (Setup): 7 tasks
- Phase 2 (Foundational): 8 tasks
- Phase 3 (US1): 19 tasks
- Phase 4 (US2): 10 tasks
- Phase 5 (US4): 10 tasks
- Phase 6 (US3): 8 tasks
- Phase 7 (Polish): 8 tasks (T063–T070)
- **Total: 70 tasks**

---

## Notes

- `[P]` tasks target different files with no blocking dependencies — safe to parallelize once the referenced contract and data shapes are settled
- `[Story]` label maps every task to a user story for traceability
- Each user story is independently completable and testable
- Zustand is a cache: always mutate Rust first, update store on success only
- Rust tests (`cargo test`) verify parser, migrations, and DB round-trips; Vitest tests verify store behavior and page-level happy paths via mocked Tauri commands
- `sessionCardIds` from `start_review_session` MUST NOT be re-sorted on the frontend — server enforces ordering
- Explicit user confirmation required before `delete_card`, `remove_dictionary`, `delete_collection`
- Aggregated `HeadwordDetail` is owned by the backend command surface; the frontend should make a single detail request per selected result
- SearchPage is a lookup surface; full `HeadwordDetail` lives on the dedicated headword-detail route
- One card per `headword + language` is enforced through a unique `cards(headword, language)` index plus `ConflictFailure` handling
- Imported DSL files are transient inputs; the MVP stores parsed content and source metadata in SQLite without retaining the original file
- MVP search stops at `exact` and `prefix` matching; substring and fuzzy search are deferred until a concrete algorithm and perf budget are agreed
- The development fixture CLI must stay opt-in and out of production app flows; prefer deterministic seed data so smoke tests and performance checks are reproducible
- Commit after each phase checkpoint at minimum
# Tasks: Desktop Vocabulary Learning MVP

**Input**: Design documents from `specs/001-desktop-vocab-learning/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/tauri-commands.md, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
**Tests**: Rust unit/integration tests are included per quickstart.md and research.md Decision 6. Vitest UI tests are included for store slices.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Tauri v2 monorepo, install dependencies, and configure tooling so the app window opens and the dev environment is stable.

- [ ] T001 Bootstrap React + TypeScript frontend in `src/` with Vite — create `package.json`, `vite.config.ts`, `tsconfig.json`
- [ ] T002 Initialize Tauri v2 backend in `src-tauri/` — create `Cargo.toml` with `tauri`, `tauri-plugin-sql`, `tauri-plugin-dialog`, `serde`, `serde_json`, `uuid` dependencies and `tauri.conf.json`
- [ ] T003 [P] Install and configure frontend dependencies: `react`, `react-dom`, `react-router-dom` (MemoryRouter), `zustand`, `styled-components`, `semantic-ui-react`, `fomantic-ui-css`, `@tauri-apps/plugin-dialog`
- [ ] T004 [P] Install and configure test toolchain: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@vitest/coverage-v8` — create `src/test/setup.ts`
- [ ] T005 [P] Create Tauri mock for tests in `src/test/__mocks__/@tauri-apps/api/core.ts`
- [ ] T006 [P] Configure Tauri v2 capabilities in `src-tauri/capabilities/` — grant `dialog:allow-open` (native file picker), `fs:allow-read` scoped to user-selected paths only, and `sql:allow-execute` / `sql:allow-select` for app data dir; no broader filesystem access
- [ ] T007 [P] Set up `src/theme/theme.ts` (typed theme constant), `src/theme/styled.d.ts` (DefaultTheme augmentation), `src/theme/GlobalStyles.ts`

**Checkpoint**: `npm run tauri dev` opens the desktop window; `npm test` and `cargo test` execute without errors

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Rust/frontend boundaries that ALL user stories depend on — SQLite schema, migration runner, shared models, AppState, contract-aligned command wrappers, and the app shell skeleton.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T008 Create SQLite DDL and migration runner in `src-tauri/src/db/schema.rs` (including `src-tauri/src/db/mod.rs`) — on first run, create every required schema object if missing using idempotent `CREATE TABLE IF NOT EXISTS` / `CREATE VIRTUAL TABLE IF NOT EXISTS` semantics; tables: `dictionaries`, `dictionary_entries`, `dictionary_entries_fts` (FTS5 on `normalized_headword`), `cards`, `collections`, `collection_memberships`, `review_events`
- [ ] T009 [P] Create shared serializable Rust structs in `src-tauri/src/models.rs` — `Dictionary`, `DictionaryEntry`, `Card`, `Collection`, `ReviewEvent`, `CommandSuccess<T>`, `CommandFailure`, `ConflictFailure`, `ImportProgressEvent`
- [ ] T010 [P] Create `AppState` and `DbPool` in `src-tauri/src/state.rs` — on app startup, open or create the SQLite database in the app data dir, run migrations before serving commands, and guarantee all required tables exist on first launch
- [ ] T011 Create the initial SQL query layer in `src-tauri/src/db/queries.rs` — shared DB helpers plus dictionary/search queries for `dictionaries`, `dictionary_entries`, and `dictionary_entries_fts`; story-specific card/collection/review queries should be added alongside those backend tasks; no inline SQL elsewhere in codebase (depends on T008, T009)
- [ ] T012 Wire `AppState` to `main.rs` — register every planned command handler with initial `CommandFailure { code: NOT_FOUND }` stubs and manage plugin initialization in `src-tauri/src/main.rs` (depends on T010)
- [ ] T013 [P] Align `specs/001-desktop-vocab-learning/contracts/tauri-commands.md` with backend-owned aggregated `HeadwordDetail` behavior and MVP `search_headwords` match kinds (`exact`, `prefix`), then create typed `invoke()` wrappers for all Tauri commands in `src/lib/tauri/commands.ts`
- [ ] T014 [P] Create `src/App.tsx` with `MemoryRouter` + `ThemeProvider` + `AppShell` skeleton and `src/main.tsx` entry point
- [ ] T015 [P] Create `src/components/templates/AppShell.tsx` and `src/components/templates/PageContainer.tsx`

**Checkpoint**: App boots on a clean first run, creates the SQLite file and all required tables automatically in the app data dir, repeated launches remain safe when tables already exist, and all command stubs return `CommandFailure` with `NOT_FOUND`

---

## Phase 3: User Story 1 — Import and Search Dictionaries (Priority: P1) 🎯 MVP

**Goal**: Users can import a DSL dictionary file, see live import progress, and search headwords by source language with exact/prefix/partial matching.

**Independent Test**: Import a valid DSL file → dictionary appears in list with correct language pair and non-zero `entryCount` → grouped search finds exact + prefix matches → opening a result renders aggregated `HeadwordDetail` for that headword — all without network access.

### Rust backend — US1

- [ ] T016 [P] [US1] Implement DSL line-by-line state machine in `src-tauri/src/dsl/parser.rs` (including `src-tauri/src/dsl/mod.rs`) — handle headword lines, tag-stripped definition lines, example lines, multi-entry headwords, and skip/count malformed blocks
- [ ] T017 [P] [US1] Write Rust unit tests for DSL parser with fixture files in `src-tauri/tests/dsl_parser_tests.rs` — cover valid entries, multi-headword, partial/malformed blocks, fully corrupt input
- [ ] T018 [US1] Implement streaming importer in `src-tauri/src/dsl/importer.rs` — reads file, calls parser, emits `ImportProgressEvent` via `Channel` every 500 parsed entries, returns `(entryCount, skippedEntryCount, warnings)` (depends on T016)
- [ ] T019 [US1] Implement `import_dictionary` command in `src-tauri/src/commands/dictionary.rs` (including `src-tauri/src/commands/mod.rs`) — accepts `ImportDictionaryInput` + `on_progress: Channel<ImportProgressEvent>`, writes to `dictionaries` + `dictionary_entries` tables, updates `import_status` lifecycle, returns `ImportDictionaryOutput` (depends on T011, T018)
- [ ] T020 [P] [US1] Implement `list_dictionaries` command in `src-tauri/src/commands/dictionary.rs`
- [ ] T021 [P] [US1] Implement `remove_dictionary` command in `src-tauri/src/commands/dictionary.rs` — cascade-deletes entries and FTS index rows
- [ ] T022 [US1] Implement `search_headwords` command in `src-tauri/src/commands/dictionary.rs` — FTS5 query on `normalized_headword`, filter by `searchLanguage` / `dictionaryIds`, group results by `headword + language`, return `matchKind` (`exact` / `prefix`) for the MVP, and respect `limit` (depends on T011)
- [ ] T023 [US1] Implement backend-owned aggregated `get_headword_detail` command in `src-tauri/src/commands/dictionary.rs` — accept a selected `headword + language`, resolve sibling entries that share that grouped identity, and return structured `HeadwordDetail` in one response (depends on T011)
- [ ] T024 [US1] Write Rust DB integration tests for import + search in `src-tauri/tests/db_integration_tests.rs` — round-trip on temp SQLite: import → list → grouped search → aggregated `get_headword_detail` (depends on T019, T022, T023)

### Frontend — US1

- [ ] T025 [P] [US1] Create `dictionarySlice.ts` in `src/store/slices/dictionarySlice.ts` — state: `dictionaries[]`, `importProgress`, `importStatus`, `searchQuery`, `searchLanguage`, `searchResults`, `selectedHeadword`, `headwordDetail`; actions: `loadDictionaries`, `importDictionary`, `removeDictionary`, `searchHeadwords`, `getHeadwordDetail`
- [ ] T026 [P] [US1] Create Zustand store root in `src/store/index.ts` — single `create()` with `StateCreator` slice composition
- [ ] T027 [US1] Build `SearchBar` molecule in `src/components/molecules/SearchBar.tsx` — debounced input + language selector dropdown (depends on T025)
- [ ] T028 [US1] Build `SearchResultCard` molecule in `src/components/molecules/SearchResultCard.tsx` — headword, matchKind badge, previewText
- [ ] T029 [US1] Build `SearchResultList` organism in `src/components/organisms/SearchResultList.tsx` — renders list of `SearchResultCard`, empty state, loading state
- [ ] T030 [US1] Build `DictionaryManager` organism in `src/components/organisms/DictionaryManager.tsx` — list imported dictionaries, import button, remove with confirmation modal, progress bar during import (uses Tauri Channel via `commands.ts`)
- [ ] T031 [US1] Build `SearchPage.tsx` in `src/pages/SearchPage.tsx` — composes `DictionaryManager`, `SearchBar`, and `SearchResultList`; when a result is selected, navigate to the dedicated headword-detail route and let the route call aggregated `get_headword_detail`; wire grouped search state to `dictionarySlice` (depends on T027–T030)
- [ ] T032 [US1] Wire `SearchPage` into `AppShell` routing in `src/App.tsx`

**Checkpoint**: User Story 1 fully functional — import → progress → grouped search → `HeadwordDetail`, offline, persists across restarts. Run `cargo test` (T017, T024) before advancing.

---

## Phase 4: User Story 2 — Save Words as Study Cards (Priority: P2)

**Goal**: Users can create a card from a dictionary entry (prefilled), edit fields, and save it to the local library.

**Independent Test**: Open an entry → create card → card prefilled with entry data → edit translation → save → card appears in LibraryPage → restart app → card still present.

### Rust backend — US2

- [ ] T033 [P] [US2] Implement `create_card_from_headword_detail` command in `src-tauri/src/commands/cards.rs` and supporting card insert/membership query helpers in `src-tauri/src/db/queries.rs` — inserts `Card` row with `language` and `source_entry_ids`, returns `CreateCardFromHeadwordDetailOutput`; on duplicate `headword + language` returns `ConflictFailure` with `existingCardId`
- [ ] T034 [P] [US2] Implement `update_card` command in `src-tauri/src/commands/cards.rs` and supporting card-update/membership-sync query helpers in `src-tauri/src/db/queries.rs` — updates mutable card fields, replaces collection memberships, sets `updated_at`
- [ ] T035 [P] [US2] Implement `get_card` command in `src-tauri/src/commands/cards.rs` and supporting lookup query helpers in `src-tauri/src/db/queries.rs` — returns full `GetCardOutput` by `cardId`
- [ ] T036 [P] [US2] Implement `list_cards` command in `src-tauri/src/commands/cards.rs` and supporting filter query helpers in `src-tauri/src/db/queries.rs` — filters by optional `collectionId` and/or `learningStatus`
- [ ] T037 [P] [US2] Implement `delete_card` command in `src-tauri/src/commands/cards.rs` and supporting delete query helpers in `src-tauri/src/db/queries.rs` — deletes card and its `collection_memberships`

### Frontend — US2

- [ ] T038 [P] [US2] Create `cardSlice.ts` in `src/store/slices/cardSlice.ts` — state: `cards[]`, `activeCard`; actions: `loadCards`, `createCard`, `updateCard`, `getCard`, `deleteCard`; Zustand is a cache — mutate Rust first, update store on success
- [ ] T039 [US2] Build `CardDetail` organism in `src/components/organisms/CardDetail.tsx` — editable form for headword, answerText, exampleText, notes, audioReference; save/cancel/delete actions with explicit confirmation on delete (depends on T038)
- [ ] T040 [US2] Build `FlashCardTile` molecule in `src/components/molecules/FlashCardTile.tsx` — compact card showing headword, answerText preview, learningStatus badge; then build `LibraryPage.tsx` in `src/pages/LibraryPage.tsx` using `FlashCardTile` for the card grid, with status filter, `CardDetail` panel, and a clear extension point for later `collectionSlice`-driven filtering (depends on T038)
- [ ] T041 [US2] Wire "Save as Card" action from `HeadwordDetailPage` (`HeadwordDetail`) — calls `create_card_from_headword_detail`; on `ConflictFailure` navigate to `existingCardId` card (depends on T033, T039)
- [ ] T042 [US2] Wire `LibraryPage` into `AppShell` routing in `src/App.tsx`

**Checkpoint**: User Stories 1 + 2 both independently functional. Run `cargo test` — parser and DB integration tests from T017 and T024 must pass; card DB round-trips will be covered by T064 in Phase 7 (constitution §IV).

---

## Phase 5: User Story 4 — Organize Cards into Collections (Priority: P2)

**Goal**: Users can create named collections, assign cards to them, and filter the card library by collection.

**Independent Test**: Create collection → assign card → card appears in collection → rename collection → cards unaffected → delete collection → cards still in general library.

### Rust backend — US4

- [ ] T043 [P] [US4] Implement `create_collection` command in `src-tauri/src/commands/collections.rs` and supporting insert query helpers in `src-tauri/src/db/queries.rs`
- [ ] T044 [P] [US4] Implement `list_collections` command in `src-tauri/src/commands/collections.rs` and supporting aggregate query helpers in `src-tauri/src/db/queries.rs` — includes `cardCount` from `collection_memberships`
- [ ] T045 [P] [US4] Implement `rename_collection` command in `src-tauri/src/commands/collections.rs` and supporting update query helpers in `src-tauri/src/db/queries.rs`
- [ ] T046 [US4] Implement `delete_collection` command in `src-tauri/src/commands/collections.rs` and supporting delete query helpers in `src-tauri/src/db/queries.rs` — deletes collection + memberships only; cards remain in library (depends on T043)

### Frontend — US4

- [ ] T047 [US4] Create `collectionSlice.ts` in `src/store/slices/collectionSlice.ts` — state: `collections[]`, `selectedCollectionId`; actions: `loadCollections`, `createCollection`, `renameCollection`, `deleteCollection`, `selectCollection`
- [ ] T048 [P] [US4] Build `CollectionBadge` molecule in `src/components/molecules/CollectionBadge.tsx` — visual label showing collection name; then build `CollectionForm` molecule in `src/components/molecules/CollectionForm.tsx` — multi-select collection assignment widget backed by `collectionSlice`, for use in `CardDetail`
- [ ] T049 [US4] Build `CollectionList` organism in `src/components/organisms/CollectionList.tsx` — list with card count, rename inline, delete with confirmation; wire collection CRUD through `collectionSlice`
- [ ] T050 [US4] Build `CollectionsPage.tsx` in `src/pages/CollectionsPage.tsx` — manage collections, set the active collection filter, and sync it with `LibraryPage` via `collectionSlice` (depends on T047, T049)
- [ ] T051 [US4] Add collection selector to `CardDetail` in `src/components/organisms/CardDetail.tsx` using `CollectionForm` and persist memberships through `update_card` `collectionIds` updates (depends on T038, T047, T048)
- [ ] T052 [US4] Wire `CollectionsPage` into `AppShell` routing in `src/App.tsx`

**Checkpoint**: User Stories 1, 2, and 4 all independently functional; collections filter library correctly. Run `cargo test` — existing parser and import tests must pass; collection and card DB round-trips will be covered by T064 in Phase 7 (constitution §IV).

---

## Phase 6: User Story 3 — Review Saved Cards (Priority: P3)

**Goal**: Users can start a review session, flip cards front→back, and mark each as learned or not learned, with status persisting across restarts.

**Independent Test**: Save ≥1 card → start review → cards arrive in order (unreviewed first, not_learned, learned, random within group) → flip card → mark learned/not_learned → restart app → updated status visible in library and next review session.

### Rust backend — US3

- [ ] T053 [P] [US3] Implement `start_review_session` command in `src-tauri/src/commands/review.rs` and supporting session query helpers in `src-tauri/src/db/queries.rs` — queries cards (filtered by optional `collectionId`), returns `sessionCardIds` ordered server-side: `unreviewed → not_learned → learned`, randomized within each group
- [ ] T054 [P] [US3] Implement `record_review_result` command in `src-tauri/src/commands/review.rs` and supporting write query helpers in `src-tauri/src/db/queries.rs` — inserts `ReviewEvent` row, updates `Card.learning_status` and `last_reviewed_at`

### Frontend — US3

- [ ] T055 [P] [US3] Create `reviewSessionSlice.ts` in `src/store/slices/reviewSessionSlice.ts` — state: `sessionCardIds[]`, `currentIndex`, `isFlipped`, `sessionComplete`; actions: `startSession`, `flipCard`, `recordResult`, `advance`; treat `sessionCardIds` as an immutable ordered queue — MUST NOT re-sort
- [ ] T056 [US3] Build `FlipCard` organism in `src/components/organisms/FlipCard.tsx` — renders card front (headword) and back (answerText + exampleText); flip animation (depends on T055)
- [ ] T057 [US3] Build `ReviewControls` molecule in `src/components/molecules/ReviewControls.tsx` — "Learned" / "Not Learned" buttons + progress indicator
- [ ] T065 [P] [US3] Build `SessionStats` organism in `src/components/organisms/SessionStats.tsx` — review session end summary (total reviewed, learned count, not-learned count); used by `ReviewPage`
- [ ] T058 [US3] Build `ReviewPage.tsx` in `src/pages/ReviewPage.tsx` — composes `FlipCard` + `ReviewControls`; handles empty-collection state; shows session completion via `SessionStats` organism (depends on T055–T057, T065)
- [ ] T059 [US3] Wire `ReviewPage` into `AppShell` routing in `src/App.tsx`

**Checkpoint**: Full MVP loop functional — import → search → create card → organize → review → persist. Run `cargo test` to verify review command round-trips (covered by T064; constitution §IV).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Navigation plumbing, error surfaces, remaining tests, and quickstart validation.

- [ ] T060 Implement full `AppShell` navigation/sidebar in `src/components/templates/AppShell.tsx` — links to Search, Library, Collections, Review pages; active-route highlighting; correct Tab focus order, Escape closes open modals/panels, Enter submits forms (constitution §I keyboard requirement)
- [ ] T061 [P] Build reusable `atoms/` wrappers in `src/components/atoms/` — `Button`, `Input`, `Label`, `Loader`, `Progress` as thin typed wrappers over Semantic UI React primitives
- [ ] T062 [P] Add empty-state and error-boundary components in `src/components/organisms/` — covers: no dictionaries, no search results, no cards, no collections
- [ ] T063 [P] Write Vitest coverage for all Zustand store slices plus page-level happy-path tests for `SearchPage`, `LibraryPage`, `CollectionsPage`, and `ReviewPage` in `src/test/` — mock Tauri commands via `src/test/__mocks__/@tauri-apps/api/core.ts`
- [ ] T064 [P] Extend `src-tauri/tests/db_integration_tests.rs` — add round-trips for cards (create/update/delete/conflict), collections (create/rename/delete/membership), and review (start_session ordering + record_result)
- [ ] T066 [P] Add a development-only fixture seeding CLI in `src-tauri/Cargo.toml`, `src-tauri/src/dev/fixtures.rs`, `src-tauri/src/bin/seed_dev_db.rs`, and `package.json` — populate SQLite with realistic dictionaries, cards, collections, memberships, and review events for local development using `fake-rs`; support deterministic seeding via an explicit seed argument
- [ ] T067 Run quickstart.md manual smoke test checklist and confirm all 10 steps pass
- [ ] T068 Benchmark search against a 200,000-entry SQLite database — verify p95 response time < 1 second on a typical consumer desktop machine (SC-001); document result in quickstart.md or a perf note

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; tasks T001–T007 can all run in parallel after T001/T002
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — blocks ALL user story phases
- **Phase 3 (US1)**: Depends on Phase 2 — highest priority, start first
- **Phase 4 (US2)**: Depends on Phase 2 — can start after Phase 2 or overlap with Phase 3
- **Phase 5 (US4)**: Depends on Phase 4 (cards must exist before collection assignment)
- **Phase 6 (US3)**: Depends on Phase 2 — backend/session work can begin after Phase 2, but end-to-end validation depends on Phase 4 because review needs saved cards
- **Phase 7 (Polish)**: Depends on all desired story phases complete

### User Story Dependencies

- **US1 (P1)**: Unblocked after Phase 2 — independent of US2/US3/US4
- **US2 (P2)**: Depends on the US1 `HeadwordDetail` flow for the primary "save from dictionary" path; backend card CRUD can start once Phase 2 is complete
- **US4 (P2)**: Depends on US2 (cards must be creatable before collection assignment)
- **US3 (P3)**: Backend review plumbing can start after Phase 2, but end-to-end story completion depends on US2 because review requires saved cards; collection-filtered review also benefits from US4

### Within Each Phase

- Rust backend tasks before frontend tasks within a story (commands must exist to mock/stub)
- Models/queries before command handlers
- Store slices before page components
- Page components before routing wire-up

### Parallel Opportunities

- All `[P]` tasks within a phase can run simultaneously
- Rust backend tasks (T016–T024) and frontend store setup (T025–T026) within US1 can run in parallel once T013 locks the contract shape
- US1 backend and US2 backend can overlap once Phase 2 is complete

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, launch simultaneously:
Task T016: "Implement DSL parser in src-tauri/src/dsl/parser.rs"
Task T017: "Write parser unit tests in src-tauri/tests/dsl_parser_tests.rs"
Task T020: "Implement list_dictionaries in src-tauri/src/commands/dictionary.rs"
Task T021: "Implement remove_dictionary in src-tauri/src/commands/dictionary.rs"
Task T025: "Create dictionarySlice.ts in src/store/slices/dictionarySlice.ts"
Task T026: "Create store root in src/store/index.ts"

# Then, after T016 completes:
Task T018: "Implement streaming importer in src-tauri/src/dsl/importer.rs"

# Then, after T018 + T011:
Task T019: "Implement import_dictionary command"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (import + search)
4. **STOP and VALIDATE**: import a real DSL file, search for words, open `HeadwordDetail` offline
5. Demo / share — the core product loop is already useful

### Incremental Delivery

1. Setup + Foundational → project boots, migrations run
2. US1 → dictionary import + search (MVP core)
3. US2 → card creation + library (learning begins)
4. US4 → collections (organization layer)
5. US3 → review mode (active practice loop)
6. Polish + dev seeding CLI → complete the product and speed up local QA/perf validation

### Total Task Count

- Phase 1 (Setup): 7 tasks
- Phase 2 (Foundational): 8 tasks
- Phase 3 (US1): 17 tasks
- Phase 4 (US2): 10 tasks
- Phase 5 (US4): 10 tasks
- Phase 6 (US3): 8 tasks
- Phase 7 (Polish): 8 tasks (T060–T064, T066–T068)
- **Total: 68 tasks**

---

## Notes

- `[P]` tasks target different files with no blocking dependencies — safe to parallelize once the referenced contract and data shapes are settled
- `[Story]` label maps every task to a user story for traceability
- Each user story is independently completable and testable
- Zustand is a cache: always mutate Rust first, update store on success only
- Rust tests (`cargo test`) verify parser, migrations, and DB round-trips; Vitest tests verify store behavior and page-level happy paths via mocked Tauri commands
- `sessionCardIds` from `start_review_session` MUST NOT be re-sorted on the frontend — server enforces ordering
- Explicit user confirmation required before `delete_card`, `remove_dictionary`, `delete_collection`
- Aggregated `HeadwordDetail` is owned by the backend command surface; the frontend should make a single detail request per selected result
- MVP search stops at `exact` and `prefix` matching; substring, partial, and fuzzy search are deferred until a concrete algorithm and perf budget are agreed
- The development fixture CLI must stay opt-in and out of production app flows; prefer deterministic seed data so smoke tests and performance checks are reproducible
- Commit after each phase checkpoint at minimum
