# Tasks: Desktop Vocabulary Learning MVP

**Input**: Design documents from `/Users/gremlin/projects/singapur-cards/apps/desktop/specs/001-desktop-vocab-learning/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/tauri-commands.md`, `quickstart.md`

**Tests**: Include Rust unit/integration tests plus Vitest/React Testing Library coverage because the plan explicitly requires automated verification for parser, database, store, and UI behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and validated independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when dependencies are already complete and files do not overlap
- **[Story]**: Maps implementation work to a specific user story from `spec.md`
- Every task below includes the concrete file path an implementation agent should change

## Phase 1: Setup

**Purpose**: Bootstrap the desktop app workspace and testing/tooling baseline.

- [ ] T001 Initialize the React + TypeScript + Vite desktop frontend workspace in `package.json`, `tsconfig.json`, `vite.config.ts`, and `src/main.tsx`
- [ ] T002 Initialize the Tauri v2 backend workspace in `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and `src-tauri/src/main.rs`
- [ ] T003 [P] Configure frontend test tooling and Tauri mocks in `vitest.config.ts`, `src/test/setup.ts`, and `src/test/__mocks__/@tauri-apps/api/core.ts`
- [ ] T004 [P] Create the styled-components theme, global styles, and top-level component barrel exports in `src/styles/theme.ts`, `src/styles/styled.d.ts`, `src/styles/GlobalStyles.ts`, and `src/components/index.ts`

---

## Phase 2: Foundational

**Purpose**: Build the shared architecture that blocks all user stories until complete.

**Critical**: User story work starts only after this phase is done.

- [ ] T005 Create the root app shell and route mounting in `src/app/App.tsx`, `src/routes/index.tsx`, and `src/components/templates/AppShellLayout.tsx`
- [ ] T006 [P] Scaffold shared atomic UI primitives and reusable molecules in `src/components/atoms/Button.tsx`, `src/components/atoms/Input.tsx`, `src/components/atoms/Loader.tsx`, `src/components/molecules/SearchBar.tsx`, and `src/components/molecules/CollectionBadge.tsx`
- [ ] T007 [P] Scaffold reusable organisms and template barrel exports in `src/components/organisms/SearchResultList.tsx`, `src/components/organisms/CardGrid.tsx`, `src/components/organisms/SessionStats.tsx`, and `src/components/templates/index.ts`
- [ ] T008 Align the Tauri command contract with aggregated entry detail and full collection lifecycle requirements in `specs/001-desktop-vocab-learning/contracts/tauri-commands.md`
- [ ] T009 [P] Define frontend command/result types and typed invoke wrappers in `src/types/commands.ts` and `src/lib/tauri/commands.ts`
- [ ] T010 [P] Implement SQLite schema creation and migration bootstrap in `src-tauri/src/db/schema.rs` and `src-tauri/src/db/mod.rs`
- [ ] T011 [P] Implement shared Rust models, app state, and command registration in `src-tauri/src/models.rs`, `src-tauri/src/state.rs`, and `src-tauri/src/commands/mod.rs`
- [ ] T012 [P] Implement the DSL parser with fixture-driven unit coverage in `src-tauri/src/dsl/parser.rs` and `src-tauri/tests/dsl_parser_tests.rs`
- [ ] T013 [P] Implement the SQL query layer and search indexes in `src-tauri/src/db/queries.rs` and `src-tauri/src/db/mod.rs`
- [ ] T014 [P] Compose Zustand slices for dictionaries, cards, collections, and review session state in `src/stores/index.ts`, `src/stores/slices/dictionarySlice.ts`, `src/stores/slices/cardSlice.ts`, and `src/stores/slices/reviewSessionSlice.ts`
- [ ] T015 Register the minimum Tauri capabilities for dialogs, filesystem access, and SQLite in `src-tauri/capabilities/default.json` and `src-tauri/tauri.conf.json`

**Checkpoint**: The app can boot, run migrations, register commands, and expose typed frontend/backend boundaries.

---

## Phase 3: User Story 1 - Import and Search Dictionaries (Priority: P1) MVP

**Goal**: Let users import local DSL dictionaries, filter by source language, search quickly, and open an aggregated entry detail page offline.

**Independent Test**: Import a valid DSL file, watch visible progress, search exact/partial/fuzzy terms by selected source language, and open a structured entry detail page without network access.

### Tests for User Story 1

- [ ] T016 [P] [US1] Add Rust integration coverage for dictionary import, search filtering, and aggregated entry detail in `src-tauri/tests/db_integration_tests.rs`
- [ ] T017 [P] [US1] Add frontend import/search route tests in `src/features/dictionaries/__tests__/DictionaryImportFlow.test.tsx`, `src/features/search/__tests__/SearchPage.test.tsx`, and `src/features/search/__tests__/EntryDetailPage.test.tsx`

### Implementation for User Story 1

- [ ] T018 [P] [US1] Implement the streaming dictionary importer and progress lifecycle in `src-tauri/src/dsl/importer.rs` and `src-tauri/src/commands/dictionary.rs`
- [ ] T019 [P] [US1] Implement dictionary list and remove commands with structured failure payloads in `src-tauri/src/commands/dictionary.rs` and `src-tauri/src/db/queries.rs`
- [ ] T020 [P] [US1] Implement search and aggregated entry-detail commands with source-language filtering in `src-tauri/src/commands/search.rs` and `src-tauri/src/db/queries.rs`
- [ ] T021 [P] [US1] Build the dictionary import form and local library management panel in `src/features/dictionaries/components/DictionaryImportForm.tsx`, `src/features/dictionaries/components/DictionaryLibraryPanel.tsx`, and `src/routes/SearchPage.tsx`
- [ ] T022 [P] [US1] Build live search, no-results feedback, and source-language filtering using shared components in `src/features/search/components/SearchToolbar.tsx`, `src/features/search/components/SearchEmptyState.tsx`, and `src/routes/SearchPage.tsx`
- [ ] T023 [US1] Build the aggregated dictionary entry page and wire command/store integration in `src/features/search/components/EntryDetailPanel.tsx`, `src/routes/EntryDetailPage.tsx`, `src/stores/slices/dictionarySlice.ts`, and `src/lib/tauri/commands.ts`

**Checkpoint**: User Story 1 is complete when dictionary import, search, and entry viewing all work locally and remain responsive on larger datasets.

---

## Phase 4: User Story 4 - Organize Cards into Collections (Priority: P2)

**Goal**: Let users create, rename, delete, and browse collections so saved cards can be organized without duplicating card data.

**Independent Test**: Create a collection, rename it, assign cards to it, verify collection-only browsing, then delete the collection and confirm the cards remain in the general library.

### Tests for User Story 4

- [ ] T024 [P] [US4] Add Rust integration coverage for collection lifecycle and card membership persistence in `src-tauri/tests/db_integration_tests.rs`
- [ ] T025 [P] [US4] Add frontend collection management tests in `src/features/collections/__tests__/CollectionsPage.test.tsx` and `src/features/cards/__tests__/CollectionMembershipPicker.test.tsx`

### Implementation for User Story 4

- [ ] T026 [P] [US4] Implement collection create, list, rename, delete, and membership commands in `src-tauri/src/commands/collections.rs` and `src-tauri/src/db/queries.rs`
- [ ] T027 [P] [US4] Extend the card store cache with collection loading and membership actions in `src/stores/slices/cardSlice.ts` and `src/lib/tauri/commands.ts`
- [ ] T028 [P] [US4] Build collection list and collection form UI in `src/components/molecules/CollectionForm.tsx`, `src/components/organisms/CollectionList.tsx`, and `src/routes/CollectionsPage.tsx`
- [ ] T029 [US4] Add collection assignment controls and delete-confirmation flows in `src/features/cards/components/CollectionMembershipPicker.tsx`, `src/routes/CollectionsPage.tsx`, and `src/components/organisms/CardGrid.tsx`

**Checkpoint**: Collections can be managed independently, and assigning cards to multiple collections does not duplicate the underlying card records.

---

## Phase 5: User Story 2 - Save Words as Study Cards (Priority: P2)

**Goal**: Let users create editable study cards from dictionary entries and persist them locally with optional collection membership.

**Independent Test**: Open an entry detail page, create a card from it, edit card fields, assign the card to one or more collections, restart the app, and confirm the card still exists with the saved values.

### Tests for User Story 2

- [ ] T030 [P] [US2] Add Rust integration coverage for card creation, update, listing, and duplicate-card validation in `src-tauri/tests/db_integration_tests.rs`
- [ ] T031 [P] [US2] Add frontend card editor and library tests in `src/features/cards/__tests__/CardEditor.test.tsx` and `src/features/cards/__tests__/LibraryPage.test.tsx`

### Implementation for User Story 2

- [ ] T032 [P] [US2] Implement card create, update, and list commands with duplicate-card handling in `src-tauri/src/commands/cards.rs` and `src-tauri/src/db/queries.rs`
- [ ] T033 [P] [US2] Build the card editor and save-from-entry workflow in `src/components/organisms/CardDetail.tsx`, `src/features/cards/components/CardEditor.tsx`, and `src/features/search/components/EntryDetailPanel.tsx`
- [ ] T034 [P] [US2] Build saved-card browsing and collection-filter views in `src/components/organisms/CardGrid.tsx`, `src/features/cards/components/CardLibraryFilters.tsx`, and `src/routes/LibraryPage.tsx`
- [ ] T035 [US2] Wire card persistence, edit validation, and restart-safe reload behavior in `src/stores/slices/cardSlice.ts`, `src/routes/LibraryPage.tsx`, and `src/lib/tauri/commands.ts`

**Checkpoint**: Users can save cards from dictionary entries, edit them later, and browse the saved library after restarting the app.

---

## Phase 6: User Story 3 - Review Saved Cards (Priority: P3)

**Goal**: Let users study cards in a focused front/back review flow and record learned or not-learned results persistently.

**Independent Test**: Start a review session for all cards or a selected collection, flip cards one by one, mark outcomes, restart the app, and confirm the latest learning state is preserved.

### Tests for User Story 3

- [ ] T036 [P] [US3] Add Rust integration coverage for review session loading and review-result persistence in `src-tauri/tests/db_integration_tests.rs`
- [ ] T037 [P] [US3] Add frontend review route and session-slice tests in `src/features/review/__tests__/ReviewPage.test.tsx` and `src/features/review/__tests__/reviewSessionSlice.test.ts`

### Implementation for User Story 3

- [ ] T038 [P] [US3] Implement review session start and review-result recording commands in `src-tauri/src/commands/review.rs` and `src-tauri/src/db/queries.rs`
- [ ] T039 [P] [US3] Build review session store logic and card queue selectors in `src/stores/slices/reviewSessionSlice.ts` and `src/stores/index.ts`
- [ ] T040 [P] [US3] Build the flip-card study UI and session stats view in `src/components/organisms/FlipCard.tsx`, `src/components/organisms/SessionStats.tsx`, `src/features/review/components/ReviewControls.tsx`, and `src/routes/ReviewPage.tsx`
- [ ] T041 [US3] Sync learned/not-learned results back into card browsing and collection review entry points in `src/stores/slices/cardSlice.ts`, `src/routes/LibraryPage.tsx`, and `src/routes/ReviewPage.tsx`

**Checkpoint**: Review mode works with both all-card and collection-scoped sessions, and status changes are visible in later browsing sessions.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finish verification, documentation, and performance/error-handling work that spans multiple stories.

- [ ] T042 [P] Document local setup and manual smoke-test workflow in `README.md` and `tests/manual/desktop-vocab-learning-smoke.md`
- [ ] T043 Optimize import/search performance and offline error messaging in `src-tauri/src/dsl/importer.rs`, `src-tauri/src/db/queries.rs`, and `src/features/search/components/SearchEmptyState.tsx`
- [ ] T044 [P] Run the verification suite and capture any follow-up fixes in `package.json`, `src-tauri/Cargo.toml`, and `tests/manual/desktop-vocab-learning-smoke.md`
- [ ] T045 [P] Add a development-only fixture seeding command that populates SQLite with fake dictionaries, cards, collections, and review data using `fake-rs`(or alternative) in `src-tauri/Cargo.toml`, `src-tauri/src/dev/fixtures.rs`, `src-tauri/src/bin/seed_dev_db.rs`, and `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no prerequisites and can begin immediately.
- Foundational (Phase 2) depends on Setup and blocks every user story.
- User Story 1 (Phase 3) depends only on Foundational and is the MVP slice.
- User Story 4 (Phase 4) depends on Foundational and establishes collection management needed by later card assignment flows.
- User Story 2 (Phase 5) depends on Foundational and uses the collection-management behavior from Phase 4 for full acceptance coverage.
- User Story 3 (Phase 6) depends on Foundational and on saved cards from Phase 5; collection-scoped review benefits from Phase 4.
- Polish (Phase 7) depends on whichever user stories are in scope for the release.

### User Story Dependencies

- `US1` has no dependency on later stories.
- `US4` is independent of `US1` at the data layer but is best scheduled before `US2` because card assignment relies on collection management.
- `US2` depends on `US1` for entry-detail-driven card creation and on `US4` for full collection assignment behavior.
- `US3` depends on `US2` because review sessions require saved cards; collection-filtered review also uses `US4`.

### Within Each User Story

- Write story tests before implementation work and confirm they fail against the unfinished behavior.
- Backend command/query work should land before frontend state wiring.
- Shared store updates should land before route-level integration.
- A story is done only after its independent test passes without relying on unfinished future stories.

### Parallel Opportunities

- `T003` and `T004` can run in parallel after `T001`.
- `T006`, `T007`, `T009`, `T010`, `T011`, `T012`, `T013`, `T014`, and `T015` can run in parallel once `T005` and `T008` are complete where needed.
- In `US1`, `T016` and `T017` can run in parallel, then `T018`, `T019`, `T020`, `T021`, and `T022` can be split across backend and frontend owners before `T023` integrates them.
- In `US4`, `T024` and `T025` can run in parallel, then `T026`, `T027`, and `T028` can proceed in parallel before `T029`.
- In `US2`, `T030` and `T031` can run in parallel, then `T032`, `T033`, and `T034` can proceed in parallel before `T035`.
- In `US3`, `T036` and `T037` can run in parallel, then `T038`, `T039`, and `T040` can proceed in parallel before `T041`.

---

## Parallel Example: User Story 1

```bash
Task: "T016 [US1] Add Rust integration coverage for dictionary import, search filtering, and aggregated entry detail in src-tauri/tests/db_integration_tests.rs"
Task: "T017 [US1] Add frontend import/search route tests in src/features/dictionaries/__tests__/DictionaryImportFlow.test.tsx, src/features/search/__tests__/SearchPage.test.tsx, and src/features/search/__tests__/EntryDetailPage.test.tsx"

Task: "T018 [US1] Implement the streaming dictionary importer and progress lifecycle in src-tauri/src/dsl/importer.rs and src-tauri/src/commands/dictionary.rs"
Task: "T020 [US1] Implement search and aggregated entry-detail commands with source-language filtering in src-tauri/src/commands/search.rs and src-tauri/src/db/queries.rs"
Task: "T021 [US1] Build the dictionary import form and local library management panel in src/features/dictionaries/components/DictionaryImportForm.tsx, src/features/dictionaries/components/DictionaryLibraryPanel.tsx, and src/routes/SearchPage.tsx"
Task: "T022 [US1] Build live search, no-results feedback, and source-language filtering using shared components in src/features/search/components/SearchToolbar.tsx, src/features/search/components/SearchEmptyState.tsx, and src/routes/SearchPage.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "T024 [US4] Add Rust integration coverage for collection lifecycle and card membership persistence in src-tauri/tests/db_integration_tests.rs"
Task: "T025 [US4] Add frontend collection management tests in src/features/collections/__tests__/CollectionsPage.test.tsx and src/features/cards/__tests__/CollectionMembershipPicker.test.tsx"

Task: "T026 [US4] Implement collection create, list, rename, delete, and membership commands in src-tauri/src/commands/collections.rs and src-tauri/src/db/queries.rs"
Task: "T028 [US4] Build collection list and collection form UI in src/components/molecules/CollectionForm.tsx, src/components/organisms/CollectionList.tsx, and src/routes/CollectionsPage.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T030 [US2] Add Rust integration coverage for card creation, update, listing, and duplicate-card validation in src-tauri/tests/db_integration_tests.rs"
Task: "T031 [US2] Add frontend card editor and library tests in src/features/cards/__tests__/CardEditor.test.tsx and src/features/cards/__tests__/LibraryPage.test.tsx"

Task: "T032 [US2] Implement card create, update, and list commands with duplicate-card handling in src-tauri/src/commands/cards.rs and src-tauri/src/db/queries.rs"
Task: "T033 [US2] Build the card editor and save-from-entry workflow in src/components/organisms/CardDetail.tsx, src/features/cards/components/CardEditor.tsx, and src/features/search/components/EntryDetailPanel.tsx"
Task: "T034 [US2] Build saved-card browsing and collection-filter views in src/components/organisms/CardGrid.tsx, src/features/cards/components/CardLibraryFilters.tsx, and src/routes/LibraryPage.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "T036 [US3] Add Rust integration coverage for review session loading and review-result persistence in src-tauri/tests/db_integration_tests.rs"
Task: "T037 [US3] Add frontend review route and session-slice tests in src/features/review/__tests__/ReviewPage.test.tsx and src/features/review/__tests__/reviewSessionSlice.test.ts"

Task: "T038 [US3] Implement review session start and review-result recording commands in src-tauri/src/commands/review.rs and src-tauri/src/db/queries.rs"
Task: "T039 [US3] Build review session store logic and card queue selectors in src/stores/slices/reviewSessionSlice.ts and src/stores/index.ts"
Task: "T040 [US3] Build the flip-card study UI and session stats view in src/components/organisms/FlipCard.tsx, src/components/organisms/SessionStats.tsx, src/features/review/components/ReviewControls.tsx, and src/routes/ReviewPage.tsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate import, search, and entry-detail flows against the independent test before moving on.

### Incremental Delivery

1. Ship `US1` first as the searchable offline dictionary MVP.
2. Add `US4` next so collections exist before card assignment workflows expand.
3. Add `US2` to convert dictionary lookups into persistent study cards.
4. Add `US3` to close the learning loop with review sessions.
5. Finish with Phase 7 performance, docs, and verification cleanup.

### Suggested MVP Scope

- MVP release: Phase 1 + Phase 2 + Phase 3 (`US1`)
- First learning release: Add Phase 4 (`US4`) and Phase 5 (`US2`)
- Full MVP loop: Add Phase 6 (`US3`) and Phase 7 polish

---

## Notes

- All checklist items follow the required `- [ ] T### [P?] [US?] Description with file path` format.
- Tests are included because the implementation plan explicitly requires automated verification across Rust and React layers.
- `T008` is intentional: the existing contract artifact does not yet fully cover aggregated entry details or collection lifecycle operations required by the spec.
