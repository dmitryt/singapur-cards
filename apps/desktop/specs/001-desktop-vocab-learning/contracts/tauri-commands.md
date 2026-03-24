# Contract: Tauri Command Surface

## Purpose

Define the frontend-to-backend command contract for the desktop MVP. The React application calls these commands through Tauri, and the Rust layer owns filesystem, parsing, indexing, and SQLite writes.

## Command Design Rules

- Commands return structured success and failure payloads.
- User-facing validation failures must include actionable messages.
- Commands performing writes are explicit and never implied by reads.
- Commands must remain offline-safe and operate only on local resources for MVP flows.

## Shared Result Shapes

### Success Result

```ts
type CommandSuccess<T> = {
  ok: true
  data: T
}
```

### Failure Result

```ts
type CommandFailure = {
  ok: false
  code:
    | "INVALID_INPUT"
    | "FILE_READ_FAILED"
    | "PARSE_FAILED"
    | "NOT_FOUND"
    | "CONFLICT"
    | "PERSISTENCE_FAILED"
    | "UNEXPECTED_ERROR"
  message: string
}
```

For `CONFLICT` failures from `create_card_from_entry`, a structured variant is returned:

```ts
type ConflictFailure = {
  ok: false
  code: "CONFLICT"
  message: string
  existingCardId: string  // ID of the card that already exists for this entry
}
```

## Dictionary Commands

### `import_dictionary`

**Input**:

```ts
type ImportDictionaryInput = {
  filePath: string
  displayName?: string
  languageFrom: string
  languageTo: string
}
```

**Progress events** (via `Channel<ImportProgressEvent>` parameter):

```ts
type ImportProgressEvent = {
  processedEntries: number
  totalEstimate?: number  // may be absent during initial file scan
  phase: "scanning" | "indexing" | "finalizing"
}
```

The command accepts an `on_progress` channel parameter. The frontend creates the channel before invoking, receives incremental progress events via `onmessage`, and lets the channel drop after the command resolves.

**Success data**:

```ts
type ImportDictionaryOutput = {
  dictionaryId: string
  name: string
  languageFrom: string
  languageTo: string
  importStatus: "queued" | "importing" | "ready" | "failed"
  entryCount: number
  skippedEntryCount: number   // count of unparseable entries; 0 if fully clean
  warnings?: string           // human-readable summary when skippedEntryCount > 0
}
```

**Behavior**:
- Accepts a user-selected local DSL file
- Accepts the dictionary source and target language metadata provided by the user
- Streams progress events via the `on_progress` channel during parsing and indexing
- On partially readable files: imports all valid entries, sets `skippedEntryCount`, and includes a `warnings` summary
- On fully unreadable files: returns a `PARSE_FAILED` failure with a clear error message
- Returns the resulting dictionary record on success

### `list_dictionaries`

**Input**:

```ts
type ListDictionariesInput = {}
```

**Success data**:

```ts
type ListDictionariesOutput = Array<{
  id: string
  name: string
  languageFrom: string
  languageTo: string
  importStatus: "queued" | "importing" | "ready" | "failed"
  entryCount: number
}>
```

### `remove_dictionary`

**Input**:

```ts
type RemoveDictionaryInput = {
  dictionaryId: string
}
```

**Success data**:

```ts
type RemoveDictionaryOutput = {
  removedDictionaryId: string
}
```

**Behavior**:
- Deletes the imported dictionary and its indexed entries only after explicit user confirmation in the UI

## Search Commands

### `search_entries`

**Input**:

```ts
type SearchEntriesInput = {
  query: string
  searchLanguage?: string
  dictionaryIds?: string[]
  limit?: number
}
```

**Success data**:

```ts
type SearchEntriesOutput = Array<{
  entryId: string
  dictionaryId: string
  languageFrom: string
  languageTo: string
  headword: string
  transcription?: string
  previewText: string
  matchKind: "exact" | "prefix" | "partial" | "fuzzy"
}>
```

**Behavior**:
- If `searchLanguage` is provided, only entries belonging to dictionaries whose `languageFrom` matches that value are eligible to match.
- `dictionaryIds` can further narrow results within the selected source language when both filters are provided.

### `get_entry_detail`

**Input**:

```ts
type GetEntryDetailInput = {
  entryId: string
}
```

**Success data**:

```ts
type GetEntryDetailOutput = {
  entryId: string
  dictionaryId: string
  headword: string
  transcription?: string
  definitionText: string
  exampleText?: string
  audioReference?: string
}
```

## Card Commands

### `create_card_from_entry`

**Input**:

```ts
type CreateCardFromEntryInput = {
  entryId: string
  overrideAnswerText?: string
  overrideExampleText?: string
  notes?: string
  collectionIds?: string[]
}
```

**Success data**:

```ts
type CreateCardFromEntryOutput = {
  cardId: string
  learningStatus: "unreviewed" | "learned" | "not_learned"
}
```

**Behavior**:
- If a card already exists for `entryId`, returns a `ConflictFailure` with `existingCardId` set to the existing card's ID. The frontend MUST navigate to that card rather than showing a generic error.

### `update_card`

**Input**:

```ts
type UpdateCardInput = {
  cardId: string
  headword: string
  answerText: string
  exampleText?: string
  notes?: string
  audioReference?: string
  collectionIds?: string[]
}
```

**Success data**:

```ts
type UpdateCardOutput = {
  cardId: string
  updatedAt: string
}
```

### `get_card`

**Input**:

```ts
type GetCardInput = {
  cardId: string
}
```

**Success data**:

```ts
type GetCardOutput = {
  id: string
  headword: string
  answerText: string
  exampleText?: string
  notes?: string
  audioReference?: string
  learningStatus: "unreviewed" | "learned" | "not_learned"
  collectionIds: string[]
  createdAt: string
  updatedAt: string
}
```

### `delete_card`

**Input**:

```ts
type DeleteCardInput = {
  cardId: string
}
```

**Success data**:

```ts
type DeleteCardOutput = {
  deletedCardId: string
}
```

**Behavior**:
- The UI MUST request explicit user confirmation before invoking this command

### `list_cards`

**Input**:

```ts
type ListCardsInput = {
  collectionId?: string
  learningStatus?: "unreviewed" | "learned" | "not_learned"
}
```

**Success data**:

```ts
type ListCardsOutput = Array<{
  id: string
  headword: string
  answerText: string
  learningStatus: "unreviewed" | "learned" | "not_learned"
  collectionIds: string[]
}>
```

## Collection Commands

### `create_collection`

**Input**:

```ts
type CreateCollectionInput = {
  name: string
  description?: string
}
```

**Success data**:

```ts
type CreateCollectionOutput = {
  collectionId: string
  name: string
}
```

### `list_collections`

**Input**:

```ts
type ListCollectionsInput = {}
```

**Success data**:

```ts
type ListCollectionsOutput = Array<{
  id: string
  name: string
  description?: string
  cardCount: number
}>
```

### `rename_collection`

**Input**:

```ts
type RenameCollectionInput = {
  collectionId: string
  newName: string
}
```

**Success data**:

```ts
type RenameCollectionOutput = {
  collectionId: string
  name: string
  updatedAt: string
}
```

### `delete_collection`

**Input**:

```ts
type DeleteCollectionInput = {
  collectionId: string
}
```

**Success data**:

```ts
type DeleteCollectionOutput = {
  deletedCollectionId: string
}
```

**Behavior**:
- Deletes the collection record and all `CollectionMembership` rows for it
- Member cards are NOT deleted; they remain in the general card library
- The UI MUST request explicit user confirmation before invoking this command

## Review Commands

### `start_review_session`

**Input**:

```ts
type StartReviewSessionInput = {
  collectionId?: string
}
```

**Success data**:

```ts
type StartReviewSessionOutput = {
  sessionCardIds: string[]
  totalCards: number
}
```

**Behavior**:
- Cards in `sessionCardIds` are ordered server-side: `unreviewed` first, then `not_learned`, then `learned`. Within each group the order is randomized.
- Clients MUST NOT re-sort the returned slice.

### `record_review_result`

**Input**:

```ts
type RecordReviewResultInput = {
  cardId: string
  result: "learned" | "not_learned"
}
```

**Success data**:

```ts
type RecordReviewResultOutput = {
  cardId: string
  learningStatus: "learned" | "not_learned"
  reviewedAt: string
}
```

## Notes

- The frontend owns optimistic UI only where the rollback path is clear.
- Dictionary import progress can begin with request-response semantics and later evolve to event-based updates if needed.
- Any future sync, audio download, or online enrichment features should be added as separate contracts rather than extending MVP commands implicitly.
