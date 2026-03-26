# Tasks: Profile Page, Language Management & Search Bar Overhaul

**Feature**: `002-profile-language-search`
**Plan**: `plan.md`
**Spec**: `spec.md`
**Generated**: 2026-03-26

---

## Summary

| Phase | Description | Tasks |
|-------|-------------|-------|
| Phase 1 | Setup — schema, models | T001–T002 |
| Phase 2 | Foundational — queries + Tauri backend | T003–T011 |
| Phase 3 | US1: Language Management (FR-1–FR-5) | T012–T016 |
| Phase 4 | US2: Global Search Bar (FR-6–FR-8) | T017–T021 |
| Phase 4b | FR-12: Profile Page — active language selection | T028–T031 |
| Phase 5 | Polish — routing, wrapper cleanup, deletion | T022–T027 |

**Total tasks**: 31
**Parallel opportunities**: T003–T008 (queries are independent functions), T017+T018 (GlobalSearchBar + PageWithSearchBar template)

---

## Phase 1: Setup

> Schema and models are the foundation for all downstream work.
> ⚠️ T001 and T002 are already complete (done in prior session). Mark them done.

- [x] T001 Add `languages` table + English seed to `src-tauri/src/db/schema.rs`
- [x] T002 Add `Language`, `CreateLanguageInput`, `UpdateLanguageInput` structs to `src-tauri/src/models.rs`

---

## Phase 2: Foundational — Rust backend

> All backend work must be complete before any frontend slice or component can be wired up.

### DB query functions (`src-tauri/src/db/queries.rs`)

- [x] T003 [P] Add `insert_language(conn, code, title, created_at) -> Result<()>` to `src-tauri/src/db/queries.rs`
- [x] T004 [P] Add `fetch_all_languages(conn) -> Result<Vec<Language>>` (ORDER BY title ASC) to `src-tauri/src/db/queries.rs`
- [x] T005 [P] Add `fetch_language_count(conn) -> Result<i64>` to `src-tauri/src/db/queries.rs`
- [x] T006 [P] Add `update_language_title(conn, code, title) -> Result<usize>` to `src-tauri/src/db/queries.rs`
- [x] T007 [P] Add `delete_language(conn, code) -> Result<usize>` to `src-tauri/src/db/queries.rs`
- [x] T008 [P] Add `list_headwords_for_language(conn, language, limit) -> Result<Vec<String>>` (SELECT DISTINCT de.headword JOIN dictionaries WHERE language_from = ?1 AND import_status = 'ready' ORDER BY headword ASC LIMIT ?2) to `src-tauri/src/db/queries.rs`

### Tauri command layer

- [x] T009 Create `src-tauri/src/commands/languages.rs` with 5 commands: `list_languages`, `create_language` (validate `^[a-z]{2}$`, return ConflictFailure on duplicate), `update_language` (NOT_FOUND if 0 rows), `delete_language` (INVALID_INPUT guard when count ≤ 1), `list_headwords_for_language` (default limit 2000)
- [x] T010 Add `pub mod languages;` to `src-tauri/src/commands/mod.rs`
- [x] T011 Register all 5 language commands in `invoke_handler!` in `src-tauri/src/lib.rs`

**Foundational checkpoint**: Run `cargo build` in `src-tauri/` — must compile with zero errors before proceeding to Phase 3.

---

## Phase 3: US1 — Language Management (FR-1 to FR-5)

> User can view, add, edit, and remove languages on the Profile Page. Changes persist across restarts.

**Independent test criteria**: Navigate to Profile Page → English appears in list → add "de"/"German" → appears immediately → edit "German" → "Deutsch" shown → delete "Deutsch" → list returns to English only → delete button disabled when only one language remains.

### Frontend types + state

- [x] T012 [US1] Add `Language`, `CreateLanguageInput`, `UpdateLanguageInput` types and `listLanguages`, `createLanguage`, `updateLanguage`, `deleteLanguage`, `listHeadwordsForLanguage` command wrappers to `src/lib/tauri/commands.ts`
- [x] T013 [US1] Create `src/store/slices/languageSlice.ts` with state (`languages`, `isLoadingLanguages`, `selectedSearchLanguage`, `headwordsForLanguage`, `isLoadingHeadwords`) and actions (`loadLanguages`, `createLanguage`, `updateLanguage`, `deleteLanguage`, `setSelectedSearchLanguage`, `loadHeadwordsForLanguage`)
- [x] T014 [US1] Compose `createLanguageSlice` into `AppStore` in `src/store/index.ts`

### ProfilePage

- [x] T015 [US1] Create `src/pages/LanguagePage.tsx` — list rows showing `[code badge] title [Edit] [Delete]`; inline edit form (title only, code read-only) with a Cancel button that resets the form to original values without calling `updateLanguage`; add form (code `maxLength=2`, validate `/^[a-z]{2}$/`, show inline error on CONFLICT/INVALID_INPUT); Delete button shows an inline "Are you sure? [Confirm] [Cancel]" confirmation before calling `deleteLanguage` (server-side INVALID_INPUT is a safety net); Delete button disabled when `languages.length === 1` with tooltip "Cannot delete the last language"; call `loadLanguages()` after each successful CRUD operation; add `/languages` route in `App.tsx` (outside `PageWithSearchBar`); add "Languages" `<NavLink>` in `AppShell.tsx`
- [x] T016 [US1] Create `src/pages/DictionaryPage.tsx` wrapping `<DictionaryManager />`; add `/dictionaries` route in `App.tsx` (inside `PageWithSearchBar`); add "Dictionaries" `<NavLink>` in `AppShell.tsx`

---

## Phase 4: US2 — Global Search Bar (FR-6 to FR-8)

> Search bar with language filter and headword selector appears on all content pages except Profile.

**Independent test criteria**: Navigate to Library → search bar visible at top → language dropdown shows stored languages → select language → headword datalist updates → type/select a headword → navigates to `/headword/:language/:headword`. Navigate to Profile → no search bar.

### Search bar components

- [x] T017 [P] [US2] Create `src/components/organisms/GlobalSearchBar.tsx` — reads `selectedLanguage`, `searchResults`, `isSearching` from store; renders a searchable headword dropdown (Semantic UI `<Dropdown>`); disabled when `selectedLanguage` is empty; on language change resets search query via `onSearch("")`; no language dropdown (moved to ProfilePage per T028)
- [x] T018 [P] [US2] Create `src/components/templates/PageWithSearchBar.tsx` — layout route using React Router v6 `<Outlet />`; renders `<SearchBarStrip>` containing `<GlobalSearchBar />` above `<PageContent>` (flex:1, overflow-y:auto, padding from theme)

### Routing

- [x] T019 [US2] Update `src/App.tsx`: remove `SearchPage` import and route; add `ProfilePage` and `PageWithSearchBar` imports; change `initialEntries` to `["/profile"]`; wrap `LibraryPage`, `CollectionsPage`, `ReviewPage`, `HeadwordDetailPage` in layout route `<Route element={<PageWithSearchBar />}>`; move `HeadwordDetailPage` route path from `/search/headword/:language/:headword` to `/headword/:language/:headword`; add `<Route path="/profile" element={<ProfilePage />} />`; update default redirect to `/profile`
- [x] T020 [US2] Replace `<NavLink to="/search">Search</NavLink>` with `<NavLink to="/languages">Languages</NavLink>` and `<NavLink to="/dictionaries">Dictionaries</NavLink>` in `src/components/templates/AppShell.tsx`
- [x] T021 [US2] Remove outer `<PageContainer>` wrapper from `src/pages/LibraryPage.tsx`, `src/pages/CollectionsPage.tsx`, `src/pages/ReviewPage.tsx`, and `src/pages/HeadwordDetailPage.tsx` to avoid double padding from `PageWithSearchBar.PageContent`; before removing each wrapper confirm: (a) content is not flush against the window edge, (b) page scrolls correctly, (c) no background-colour or max-width provided by `PageContainer` that `PageContent` does not replicate

---

## Phase 4b: FR-12 — Profile Page (Active Language Selection)

> Moves language selection out of GlobalSearchBar and onto a dedicated Profile Page. The search bar becomes language-agnostic — it reads `selectedLanguage` from the store but no longer renders a language dropdown.

- [x] T028 [FR-12] Create `src/pages/ProfilePage.tsx` — reads `languages`, `loadLanguages`, `selectedLanguage`, `setSelectedLanguage` from store; on mount calls `loadLanguages()` and pre-selects the first language if none is set; renders a single "Active Language" `<Dropdown selection fluid>` from Semantic UI; wraps content in `<PageContainer>`
- [x] T029 [FR-12] Remove language dropdown, `languageOptions` memo, `handleLangChange`, `loadLanguages` call, and `languages` store field from `GlobalSearchBar.tsx`; keep `selectedLanguage` (used to disable headword input and reset search on language change)
- [x] T030 [FR-12] Add `/profile` route in `App.tsx` (outside `PageWithSearchBar`, alongside `/languages`)
- [x] T031 [FR-12] Add "Profile" `<NavLink to="/profile">` in `AppShell.tsx` sidebar, above "Languages"

---

## Phase 5: Polish — Cleanup (FR-9)

> Remove deprecated search components and unused state/command code.

- [x] T022 Delete `src/pages/SearchPage.tsx`
- [x] T023 Delete `src/components/molecules/SearchBar.tsx`
- [x] T024 Delete `src/components/organisms/SearchResultList.tsx`
- [x] T025 Delete `src/components/molecules/SearchResultCard.tsx`
- [x] T026 Remove `searchQuery`, `searchLanguage`, `searchResults`, `isSearching` state fields and `setSearchQuery`, `setSearchLanguage`, `searchHeadwords` actions from `src/store/slices/dictionarySlice.ts`
- [x] T027 Remove `SearchResult` type and `searchHeadwords` command wrapper from `src/lib/tauri/commands.ts` (verify no remaining imports before deleting)

---

## Dependencies

```
T001, T002 (done)
  └── T003–T008 (queries — all independent, can run in parallel)
        └── T009–T011 (Tauri commands + registration)
              └── T012–T014 (TS types + Zustand slice)
                    ├── T015–T016 (LanguagePage + DictionaryPage — US1)
                    └── T017–T018 (GlobalSearchBar + PageWithSearchBar — US2)
                          └── T019–T021 (Routing + page wrapper cleanup)
                                └── T028–T031 (ProfilePage — FR-12)
                                      └── T022–T027 (Cleanup)
```

## Parallel Execution Examples

**Phase 2 queries** (T003–T008): All 6 query functions are independent additions to the same file — implement in one pass, but logically they have no interdependency.

**Phase 4** (T017 + T018): `GlobalSearchBar.tsx` and `PageWithSearchBar.tsx` are independent files.

## Implementation Strategy

**MVP scope** (minimum to verify end-to-end):
1. T003–T011 (backend compiles)
2. T012–T014 (state wired)
3. T015 (ProfilePage lists + adds languages)
4. T017–T020 (search bar on Library page navigates to headword detail)

Then complete T016, T021, T022–T027 to finish.

---

## Final Verification

After T027, run **all 7 verification steps** from `plan.md` before closing the branch:

1. `cargo build` — no errors
2. App opens at Library; search bar visible but disabled until language selected
3. Navigate to Profile — "Active Language" dropdown shows stored languages; no search bar
4. Select a language on Profile Page — search bar on Library becomes enabled
5. Navigate to Languages — add/edit/delete language; "en" delete blocked when last
6. Navigate to Library — headword search scoped to selected language; selecting a headword navigates to detail view
7. Navigate to Profile or Languages or Dictionaries — no search bar
8. All nav links work; no broken routes
