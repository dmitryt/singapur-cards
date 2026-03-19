# Research: Vocabulary Learning Desktop App

**Branch**: `001-vocab-learning-app` | **Date**: 2026-03-19 | **Phase**: 0

---

## DSL (ABBYY Lingvo) Parsing in Rust

**Decision**: Custom line-by-line state machine + `nom` 7.x for tag bodies + `encoding_rs` for UTF-16 decoding.

**Rationale**: No published Rust crate exists for DSL parsing. DSL files are line-oriented (blank-line-separated entries, headword on first non-indented line, body lines tab-indented), making a streaming state machine faster and simpler than a PEG parser. `encoding_rs` handles UTF-16 LE/BE with BOM detection in one zero-copy pass. Body markup uses a BBCode-like tag language (`[trn]`, `[ex]`, `[m]`, etc.) that fits `nom` combinators well.

**Key implementation notes**:
- DSL files may be UTF-16 LE (older) or UTF-8 (newer); always detect via BOM.
- Stream entries — never collect all 500k entries into RAM at once. Parse → transform → batch-insert into SQLite in chunks of ~1000.
- Strip DSL tags at import time to produce a `body_plain` column for FTS5 indexing.
- Store the rendered/cleaned body as `body_html` (or plain text) for display.
- Reference: pyglossary's DSL reader is the most complete open-source spec reference.

**Alternatives considered**:
- `pest` PEG parser — rejected: grammar complexity not justified for a line-oriented format; harder to stream.
- `tauri-plugin-sql` JS-side parsing — rejected: wrong layer; parsing belongs in Rust core.

---

## SQLite FTS5 Full-Text Search

**Decision**: `rusqlite` with `bundled` + `fts5` features; content-mode FTS5 virtual table with `unicode61 remove_diacritics 2` tokenizer and prefix index.

**Rationale**: `rusqlite` with `bundled` compiles SQLite from source, guaranteeing FTS5 availability across macOS/Windows regardless of system SQLite version. Content-mode avoids storing text twice. Prefix index (`prefix='1 2 3 4 5'`) enables autocomplete-style headword search at 5–50ms for 500k entries — well inside the 500ms budget.

**FTS5 schema pattern**:
```sql
CREATE VIRTUAL TABLE headwords_fts USING fts5(
    headword,
    content='entries',
    content_rowid='id',
    tokenize='unicode61 remove_diacritics 2',
    prefix='1 2 3 4 5'
);
```

**Query pattern for prefix search**:
```sql
SELECT e.id, e.headword, e.body_html
FROM headwords_fts f JOIN entries e ON e.id = f.rowid
WHERE f.headword MATCH 'wor*'
ORDER BY rank LIMIT 50;
```

**Connection pragmas** (applied at connection open):
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA temp_store = MEMORY;
```

**Alternatives considered**:
- `sqlx` — rejected: no bundled SQLite; system SQLite on older macOS may lack FTS5; async model adds complexity without benefit for local single-user DB.
- `tauri-plugin-sql` — rejected: no FTS5 typed API; all queries cross the IPC bridge adding latency on the hot search path; no PRAGMA control.

---

## Tauri v2 SQLite Integration

**Decision**: Raw `rusqlite` managed via `tauri::State`, with `r2d2` + `r2d2_sqlite` connection pool for concurrent read/write.

**Rationale**: Business logic stays in Rust core with no IPC overhead on the search hot path. `r2d2` gives multiple read connections (search queries) while one write connection handles import batches. Full PRAGMA and FTS5 control.

**State setup pattern**:
```rust
pub struct DbPool(pub Arc<r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>>);

tauri::Builder::default()
    .manage(DbPool(Arc::new(setup_pool()?)))
    .invoke_handler(tauri::generate_handler![search_entries, import_dictionary, ...])
```

**Alternatives considered**:
- `tauri-plugin-sql` — rejected for reasons above (no FTS5, IPC overhead, no PRAGMA control).
- Single `Mutex<Connection>` — rejected: blocks search while import runs; pool is necessary for responsive UX per SC-005.

---

## Tauri v2 Background Tasks with Progress

**Decision**: `tauri::async_runtime::spawn` wrapping `spawn_blocking` for the synchronous rusqlite work; `AppHandle::emit` for progress events; command returns immediately (fire-and-forget pattern).

**Rationale**: `rusqlite` is synchronous; calling it directly in an `async` Tauri command would starve the Tokio executor. `spawn_blocking` offloads to a dedicated thread pool. `AppHandle` is `Send + Sync + Clone` in Tauri v2 so it's safe to move into spawned tasks.

**Progress payload**:
```rust
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportProgress { processed: u64, total: u64, status: String }
// status: "parsing" | "indexing" | "done" | "error"
```

**Pattern**: Command returns `Ok(())` immediately → progress arrives via `listen('import-progress', ...)` on the frontend.

**Cancellation**: `Arc<AtomicBool>` cancel flag checked at each 1000-entry batch boundary.

---

## React + Zustand Store Architecture

**Decision**: Single `create()` with `StateCreator` slices (DictionarySlice, CardSlice, ReviewSessionSlice); Rust/SQLite is source of truth; Zustand is a cache/view layer.

**Slice responsibilities**:
- **DictionarySlice** — ephemeral, never persisted: `searchQuery`, `searchResults`, `isSearching`, `searchError`, `search(query)`, `importDictionary(path)`
- **CardSlice** — loaded from Rust on startup, written back on every mutation: `cards`, `collections`, `loadCards()`, `addCard()`, `removeCard()`, `updateCard()`
- **ReviewSessionSlice** — ephemeral, never persisted: `sessionCards`, `currentIndex`, `isFlipped`, `sessionStats`, `startSession()`, `flip()`, `markLearned()`, `markNotLearned()`, `endSession()`

**Error handling rule**: Catch all `invoke` errors inside Zustand actions; surface via state fields (`searchError`, `saveError`). Never propagate unhandled rejections to components.

---

## styled-components v6 Setup

**Decision**: v6 with typed theme via `DefaultTheme` augmentation; `$`-prefixed transient props to prevent DOM forwarding.

**Breaking changes relevant to this project**:
- Transient props: use `$propName` (v6 convention) to avoid DOM prop warnings.
- `createGlobalStyle` no longer accepts generic props directly.
- React 18 concurrent mode: fully safe in v6 (uses `useInsertionEffect`).

**Theme module**: Single `theme.ts` exported as `const` (preserves literal types); `styled.d.ts` augments `DefaultTheme` for full autocomplete.

**Flip card animation**: driven by `$isFlipped` transient prop on `transform: rotateY(180deg)` with `transform-style: preserve-3d`.

---

## React Component & Routing Architecture

**Decision**: `MemoryRouter` (not `BrowserRouter`); route-per-page with shared `AppShell` layout.

**Rationale**: Tauri serves from a custom protocol — hash or memory routing is more reliable than history-based routing.

**Page structure**: `SearchPage` → `LibraryPage` → `CollectionsPage` → `ReviewPage`.

**FlipCard**: self-contained compound component; front/back as slots; driven by `isFlipped` prop from ReviewSessionSlice.

---

## Testing Stack

**Decision**: Vitest + `@testing-library/react` for frontend; `vi.mock('@tauri-apps/api/core')` for IPC isolation; `cargo test` for Rust core.

**Mock pattern**: `src/test/__mocks__/@tauri-apps/api/core.ts` exports `invoke = vi.fn()`. Per-test: `vi.mocked(invoke).mockResolvedValue(...)`.

**Layer coverage**:
- Zustand slice logic → Vitest (no React)
- UI components → Vitest + Testing Library
- Rust commands → `cargo test`
- Critical paths only → Tauri WebDriver e2e
