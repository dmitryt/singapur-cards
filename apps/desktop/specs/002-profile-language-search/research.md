# Research: Profile Page, Language Management & Search Bar Overhaul

## Decision Log

### 1. Layout Wrapper for Global Search Bar

**Decision:** React Router v6 layout route (`<Outlet />`) instead of a classic HOC wrapper.

**Rationale:** The codebase uses React Router v6 with `MemoryRouter`. Layout routes are the idiomatic v6 pattern — they avoid `displayName`/`forwardRef` complexity and naturally integrate with `<Routes>` nesting. A true HOC that wraps each page component individually would require touching every page file.

**Alternatives considered:**
- HOC `withSearchBar(Component)` — would require wrapping each page and re-exporting; more boilerplate, harder to maintain.
- Context + `useEffect` in AppShell — coupling search-bar visibility logic into the shell; less clean separation.

---

### 2. Headword Dropdown Implementation

**Decision:** Native `<input type="text" list="hw-options" />` + `<datalist>` combo for the headword selector.

**Rationale:** The codebase uses styled-components for all UI; there is no Semantic UI React dependency at the page level. Native datalist provides type-to-filter behavior without an additional dependency. It handles large lists (up to 2000 entries) efficiently in modern browsers/WebView2/WebKit used by Tauri.

**Alternatives considered:**
- Semantic UI React `Dropdown` (searchable) — not used elsewhere; would add a UI library dependency inconsistent with the current styled-components approach.
- Custom virtualized dropdown — over-engineering for this use case; not justified by current scale.

---

### 3. Language Code Validation

**Decision:** Validate with `code.len() == 2 && code.chars().all(|c| c.is_ascii_lowercase())` in Rust — no regex crate needed.

**Rationale:** The constitution (Principle V: Keep It Simple) requires justification for new dependencies. Standard library string/char methods are sufficient for this narrow constraint (ISO 639-1: exactly 2 lowercase ASCII letters).

**Alternatives considered:**
- `regex` crate with `^[a-z]{2}$` — adds a dependency for a one-liner check; not justified.

---

### 4. State Management for Language + Search Bar

**Decision:** New Zustand slice `languageSlice.ts` composed into the existing `AppStore`.

**Rationale:** Existing pattern in the codebase (dictionarySlice, cardsSlice, etc.) uses Zustand slices composed in `src/store/index.ts`. Consistent pattern minimises cognitive overhead. The language list and `selectedSearchLanguage` need to be shared between ProfilePage (CRUD) and GlobalSearchBar (read + filter).

**Alternatives considered:**
- Local component state in GlobalSearchBar — won't persist across page navigation without lifting state up.
- React Context — codebase doesn't use React Context for feature state; introducing it would be inconsistent.

---

### 5. Headword Source Query

**Decision:** `SELECT DISTINCT de.headword FROM dictionary_entries de JOIN dictionaries d ON d.id = de.dictionary_id WHERE d.language_from = ?1 AND d.import_status = 'ready' ORDER BY de.headword ASC LIMIT ?2`

**Rationale:** Headwords in the search bar are sourced from successfully imported dictionary entries (status = 'ready'). Using `DISTINCT` prevents duplicates when multiple dictionaries cover the same headword. `language_from` on the `dictionaries` table is the correct filter — headwords don't carry their own language field directly.

---

### 6. Delete Language — Headword Behaviour

**Decision:** Headwords are NOT deleted when a language is removed. They become orphaned (no dictionary language association is changed).

**Rationale:** Clarified by the user: "delete language, headwords remain untouched". Deleting dictionary entries or cards would be destructive and irreversible — violating constitution Principle II (Local Data Safety).

---

### 7. Route for Headword Detail

**Decision:** Change `/search/headword/:language/:headword` → `/headword/:language/:headword`.

**Rationale:** SearchPage is removed; it was the only navigator to the headword detail route. The new GlobalSearchBar navigates directly. Dropping the `/search` prefix cleanly separates the old search-page concept from the new lookup flow.

---

## Summary

All NEEDS CLARIFICATION items from the spec are resolved. No outstanding unknowns remain. Proceeding to Phase 1.
