# Implementation Plan: Profile Page, Language Management & Search Bar Overhaul

**Branch**: `002-profile-language-search`
**Spec**: `apps/desktop/specs/002-profile-language-search/spec.md`
**Research**: `research.md`
**Data model**: `data-model.md`
**Contracts**: `contracts/tauri-commands.md`

---

## Constitution Check

| Principle | Status | Note |
|-----------|--------|------|
| I. Desktop-First | ✅ | Keyboard-friendly forms; native datalist for headword selection |
| II. Local Data Safety | ✅ | Headwords untouched on language delete; no destructive cascade |
| III. Stable Offline | ✅ | All data is local SQLite; no network dependency |
| IV. Basic Quality Gates | ✅ | Manual verification path defined in spec scenarios |
| V. Keep It Simple | ✅ | No new crates, no new UI libraries; native datalist over custom dropdown |

---

## Implementation Order

### Step 1 — Backend: `languages` table + queries

**`src-tauri/src/db/schema.rs`** — append to `run_migrations()` after the `review_events` block:
```rust
conn.execute_batch(
    "CREATE TABLE IF NOT EXISTS languages (
        code TEXT PRIMARY KEY NOT NULL
            CHECK(LENGTH(code) = 2 AND code = LOWER(code)),
        title TEXT NOT NULL,
        created_at TEXT NOT NULL
    );"
)?;
conn.execute_batch(
    "INSERT OR IGNORE INTO languages (code, title, created_at)
     VALUES ('en', 'English', datetime('now'));"
)?;
```

**`src-tauri/src/models.rs`** — add structs:
```rust
pub struct Language { pub code: String, pub title: String, pub created_at: String }
pub struct CreateLanguageInput { pub code: String, pub title: String }
pub struct UpdateLanguageInput { pub code: String, pub title: String }
```

**`src-tauri/src/db/queries.rs`** — add language query functions after existing code:
- `insert_language(conn, code, title, created_at) -> Result<()>`
- `fetch_all_languages(conn) -> Result<Vec<Language>>` — ORDER BY title ASC
- `fetch_language_count(conn) -> Result<i64>` — for last-language guard
- `update_language_title(conn, code, title) -> Result<usize>`
- `delete_language(conn, code) -> Result<usize>`
- `list_headwords_for_language(conn, language, limit) -> Result<Vec<String>>`

SQL for `list_headwords_for_language`:
```sql
SELECT DISTINCT de.headword
FROM dictionary_entries de
JOIN dictionaries d ON d.id = de.dictionary_id
WHERE d.language_from = ?1 AND d.import_status = 'ready'
ORDER BY de.headword ASC
LIMIT ?2
```

---

### Step 2 — Backend: Tauri commands

**`src-tauri/src/commands/languages.rs`** (new file) — 5 commands:

- `list_languages` → `CommandResult<Vec<Language>>`
- `create_language(input: CreateLanguageInput)` — validate `code.len() == 2 && code.chars().all(|c| c.is_ascii_lowercase())`; return `ConflictFailure` on duplicate primary key violation
- `update_language(input: UpdateLanguageInput)` — title only; return `NOT_FOUND` if 0 rows updated
- `delete_language(code: String)` — guard: if `fetch_language_count() <= 1`, return `INVALID_INPUT` "Cannot delete the last language"
- `list_headwords_for_language(language: String, limit: Option<usize>)` → `CommandResult<Vec<String>>`, default limit 2000

**`src-tauri/src/commands/mod.rs`** — add `pub mod languages;`

**`src-tauri/src/lib.rs`** — register in `invoke_handler!`:
```
languages::list_languages,
languages::create_language,
languages::update_language,
languages::delete_language,
languages::list_headwords_for_language,
```

---

### Step 3 — Frontend: Types + command wrappers

**`src/lib/tauri/commands.ts`** — add:
```typescript
export type Language = { code: string; title: string; createdAt: string };
export type CreateLanguageInput = { code: string; title: string };
export type UpdateLanguageInput = { code: string; title: string };

listLanguages(): Promise<CommandResult<Language[]>>
createLanguage(input: CreateLanguageInput): Promise<CommandResult<Language>>
updateLanguage(input: UpdateLanguageInput): Promise<CommandResult<Language>>
deleteLanguage(code: string): Promise<CommandResult<{ deletedCode: string }>>
listHeadwordsForLanguage(language: string, limit?: number): Promise<CommandResult<string[]>>
```

---

### Step 4 — Frontend: Zustand language slice

**`src/store/slices/languageSlice.ts`** (new file):

State:
```typescript
languages: Language[]
isLoadingLanguages: boolean
selectedSearchLanguage: string   // "" until loaded; set to languages[0].code on first load
headwordsForLanguage: string[]
isLoadingHeadwords: boolean
```

Actions:
- `loadLanguages()` — fetch all, set `selectedSearchLanguage` to `languages[0].code` if currently `""`
- `createLanguage(code, title)` → `Promise<boolean>`
- `updateLanguage(code, title)` → `Promise<boolean>`
- `deleteLanguage(code)` → `Promise<{ ok: boolean; error?: string }>`
- `setSelectedSearchLanguage(code)` — sets language, clears headwords

**`src/store/index.ts`** — compose `createLanguageSlice` into `AppStore`.

---

### Step 5 — Frontend: GlobalSearchBar component

**`src/components/organisms/GlobalSearchBar.tsx`** (new file):

- Reads `{ languages, selectedSearchLanguage, headwordsForLanguage, isLoadingHeadwords, setSelectedSearchLanguage, loadLanguages }` from `useStore()`
- `useEffect([], ...)` calls `loadLanguages()` if `languages.length === 0`
- Layout: horizontal strip — language `<select>` + headword `<input type="text" list="hw-options">` + `<datalist id="hw-options">`
- On headword input change: if value is in `headwordsForLanguage`, navigate to `/headword/${encodeURIComponent(selectedSearchLanguage)}/${encodeURIComponent(value)}`
- Loading state: disable headword input + placeholder "Loading..." while `isLoadingHeadwords`
- Empty state: placeholder "No dictionaries for this language" if `headwordsForLanguage.length === 0` and not loading

---

### Step 6 — Frontend: PageWithSearchBar layout component

**`src/components/templates/PageWithSearchBar.tsx`** (new file):

Uses React Router v6 `<Outlet />` — layout route element.

```typescript
import { Outlet } from "react-router-dom";

export function PageWithSearchBar() {
  return (
    <PageWrapper>
      <SearchBarStrip>
        <GlobalSearchBar />
      </SearchBarStrip>
      <PageContent>
        <Outlet />
      </PageContent>
    </PageWrapper>
  );
}
```

---

### Step 7 — Frontend: ProfilePage

**`src/pages/ProfilePage.tsx`** (new file):

Two sections:

**A — Language Management:**
- List of languages: each row shows `[code badge] title [Edit] [Delete]`
- Delete button: disabled when `languages.length === 1` (tooltip: "Cannot delete the last language")
- Edit: inline row form with title input; code displayed as read-only
- Add form: code input (`maxLength={2}`) + title input; validate `/^[a-z]{2}$/` before Tauri call; show inline error on CONFLICT or INVALID_INPUT
- After any CRUD: call `loadLanguages()`

**B — Dictionary Management:**
- Render existing `<DictionaryManager />` unchanged (moved from SearchPage)

ProfilePage renders directly in AppShell's content area — no `PageWithSearchBar` wrapper.

---

### Step 8 — Routing

**`src/App.tsx`** changes:
1. Remove `import SearchPage` + route
2. Add `import ProfilePage`, `import { PageWithSearchBar }`
3. Change `initialEntries={["/search"]}` → `initialEntries={["/profile"]}`
4. New route structure:

```tsx
<Routes>
  <Route path="/" element={<Navigate to="/profile" replace />} />
  <Route path="/profile" element={<ProfilePage />} />
  <Route element={<PageWithSearchBar />}>
    <Route path="/library" element={<LibraryPage />} />
    <Route path="/collections" element={<CollectionsPage />} />
    <Route path="/review" element={<ReviewPage />} />
    <Route path="/headword/:language/:headword" element={<HeadwordDetailPage />} />
  </Route>
</Routes>
```

**`src/components/templates/AppShell.tsx`** — replace `<NavLink to="/search">` with `<NavLink to="/profile">Profile</NavLink>`.

---

### Step 9 — Page wrapper adjustments

`LibraryPage`, `CollectionsPage`, `ReviewPage`, `HeadwordDetailPage` currently wrap content in `<PageContainer>`. `PageWithSearchBar.PageContent` now provides padding and scroll. Remove or replace the outer `<PageContainer>` in each affected page to avoid double padding.

Verify each page individually before removing.

---

### Step 10 — Cleanup

**Delete files:**
- `src/pages/SearchPage.tsx`
- `src/components/molecules/SearchBar.tsx`
- `src/components/organisms/SearchResultList.tsx`
- `src/components/molecules/SearchResultCard.tsx`

**Modify `src/store/slices/dictionarySlice.ts`:**
- Remove: `searchQuery`, `searchLanguage`, `searchResults`, `isSearching`
- Remove: `setSearchQuery`, `setSearchLanguage`, `searchHeadwords`
- Keep: `loadDictionaries`, `importDictionary`, `removeDictionary`, `getHeadwordDetail`, `headwordDetail`, `isLoadingDetail`

**Modify `src/lib/tauri/commands.ts`:**
- Remove `SearchResult` type and `searchHeadwords` wrapper (verify no other imports first)

---

## Critical Files

| File | Role |
|------|------|
| `src-tauri/src/db/schema.rs` | Add `languages` table + English seed |
| `src-tauri/src/db/queries.rs` | Language CRUD + `list_headwords_for_language` |
| `src-tauri/src/commands/languages.rs` | New — 5 Tauri commands |
| `src/store/slices/languageSlice.ts` | New — shared state for CRUD + search bar |
| `src/components/organisms/GlobalSearchBar.tsx` | New — language select + headword datalist |
| `src/components/templates/PageWithSearchBar.tsx` | New — layout route wrapper |
| `src/pages/ProfilePage.tsx` | New — language management + DictionaryManager |
| `src/App.tsx` | Route changes, initial entry |
| `src/components/templates/AppShell.tsx` | Nav: Search → Profile |

---

## Verification Steps

1. `cargo build` in `src-tauri/` — schema, queries, commands compile
2. `npm run dev` — app opens at ProfilePage; English in language list
3. Add "de"/"German" — appears immediately; "en" delete blocked when only one language
4. Delete "de" — returns to English only; headwords still load for English
5. Navigate to Library — search bar visible; language dropdown shows languages; headword dropdown populates; selecting headword navigates to detail page
6. Navigate to Profile — no search bar visible
7. Verify no broken routes
