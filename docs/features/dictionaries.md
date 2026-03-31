### Feature: Dictionaries

#### 1. Overview
- Dictionaries are imported from local DSL files and indexed for fast lookup.
- This feature owns import/list/remove, language-scoped search, and headword detail aggregation.
- `HeadwordDetail` is the bridge output consumed by card creation flows.

#### 2. Goals & Non-Goals
- Goals:
  - Reliable local DSL import with progress visibility.
  - Fast exact/prefix headword search scoped by active language.
  - Aggregated detail view across contributing entries/dictionaries.
- Non-Goals:
  - Card persistence lifecycle (covered in [Cards](./cards.md)).
  - Advanced fuzzy search in MVP.

#### 3. User Stories
- A learner imports dictionary files and tracks progress/errors.
- A learner searches headwords by selected language.
- A learner opens headword detail with merged translation context.

#### 4. Functional Requirements
- Import accepts file path, dictionary name, source language, target language.
- Partial parse imports valid entries and reports skipped counts.
- Fully unreadable file fails with clear parse error.
- Search supports exact and prefix matching on headwords.
- Search filtering uses dictionaries whose `language_from` equals active language.

#### 5. UX / UI Description
- Dictionaries page contains import and management controls.
- Import UI shows progress states (`scanning`, `indexing`, `finalizing`).
- Search UI provides live results and explicit no-results state.
- Selecting a result opens dedicated headword detail screen.

#### 6. Data Model + Database Schema
```ts
type Dictionary = {
  id: string
  name: string
  languageFrom: string
  languageTo: string
  importStatus: "queued" | "importing" | "ready" | "failed"
  entryCount: number
}

type HeadwordDetail = {
  headword: string
  language: string
  sourceEntryIds: string[]
  entries: Array<{
    entryId: string
    dictionaryId: string
    dictionaryName: string
    definitionText: string
  }>
}
```
- SQLite tables: `dictionaries`, `dictionary_entries`, `dictionary_entries_fts`.
- FTS triggers keep normalized-headword index in sync.

#### 7. API / Integration
- `import_dictionary` (with progress channel)
- `list_dictionaries`
- `remove_dictionary`
- `search_headwords`
- `get_headword_detail`

#### 8. State Management
- Frontend tracks import task state and progress events.
- Search state includes active language, query, and result list.
- Headword detail state is derived from command response payload.

#### 9. Storage
- Normalized dictionary content persists in local SQLite after import.
- Original source DSL file is treated as transient input.
- No network dependency for dictionary workflows.

#### 10. Platforms
- Desktop: implemented target.
- Mobile: planned; no implementation in this repository.

#### 11. Permissions & Security
- File-system access is user-initiated via file picker.
- Local-only parsing and storage for non-AI workflows.
- No sensitive credential handling in dictionary operations.

#### 12. Error Handling
- Parse errors surface clear messages.
- Partial import warnings include skipped-entry summary.
- Search no-match state remains recoverable and non-blocking.
- Remove actions require explicit confirmation.

#### 13. Analytics
- Not formally specified.
- Suggested metrics:
  - import success/failure ratio
  - import duration by file size
  - search latency percentile and no-result rate

#### 14. Open Questions
- Should dictionary rename/edit metadata be exposed post-import?
- Should future search include substring/fuzzy options?
- Should per-dictionary health diagnostics be surfaced in UI?

#### 15. Future Improvements
- Incremental re-indexing and background import queues.
- Additional dictionary format adapters beyond DSL.
- Richer ranking for search result prioritization.
