# Tauri Command Contracts

**Branch**: `001-vocab-learning-app` | **Date**: 2026-03-19

All Rust commands are invoked from TypeScript via `invoke<T>(cmd, args)` from `@tauri-apps/api/core`. Commands are never called directly from React components — all calls go through `src/lib/tauri/commands.ts`.

Errors from Rust (`Err(e)`) surface as rejected promises with a string message (`e.to_string()`).

---

## Command Design Rules

- Commands return structured success and failure payloads.
- User-facing validation failures must include actionable messages.
- Commands performing writes are explicit and never implied by reads.
- Commands must remain offline-safe and operate only on local resources for MVP flows.

## Shared Result Shapes

### Success Result

```typescript
type CommandSuccess<T> = {
  ok: true
  data: T
}
```

### Failure Result

```typescript
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

## Dictionary Commands

### `search_dictionary`

Search for entries across all imported dictionaries.

**Args**:
```typescript
{ query: string; limit?: number }
```
- `query`: search term, 1–200 chars. Prefix matching on headword (fast path). Empty string returns `[]`.
- `limit`: max results to return, default 50, max 200.

**Returns**: `DictionaryEntry[]`
```typescript
interface DictionaryEntry {
  id: number;
  dictId: number;
  dictName: string;
  headword: string;
  transcription: string;
  bodyHtml: string;
}
```

**Performance target**: < 500ms for 500k entries (SC-001).

**Errors**: None expected for normal search. Returns `[]` if no match.

---

### `import_dictionary`

Start a dictionary import from a DSL file. Returns immediately; progress arrives via `import-progress` events. See `tauri-events.md`.

**Args**:
```typescript
{ path: string }
```
- `path`: absolute path to the `.dsl` file. Obtained via Tauri file dialog (never constructed by user).

**Returns**: `void` (fire-and-forget; progress via events)

**Errors**: None thrown synchronously. Import errors are emitted as `import-progress` events with `status: "error"` and an `errorMessage` field.

---

### `load_dictionaries`

List all imported dictionaries.

**Args**: none

**Returns**: `Dictionary[]`
```typescript
interface Dictionary {
  id: number;
  name: string;
  sourceFilename: string;
  importDate: number;    // Unix timestamp
  entryCount: number;
  languageFrom: string | null;
  languageTo: string | null;
}
```

---

### `delete_dictionary`

Remove a dictionary and all its entries. Cards created from this dictionary are unaffected (FR-009).

**Args**:
```typescript
{ id: number }
```

**Returns**: `void`

**Errors**: `"Dictionary not found"` if id is invalid.

---

## Card Commands

### `save_card`

Create a card from a dictionary entry. Checks for duplicates first.

**Args**:
```typescript
{
  entryId: number;
  notes?: string;
}
```

**Returns**: `SaveCardResult`
```typescript
type SaveCardResult =
  | { type: 'created'; card: Card }
  | { type: 'duplicate'; existingCard: Card };
```

The caller surfaces the duplicate to the user and may call `update_card` to overwrite or do nothing to keep both.

---

### `load_cards`

Load all cards. Called once on app start to populate the CardSlice.

**Args**: none

**Returns**: `Card[]`
```typescript
interface Card {
  id: string;           // UUID
  word: string;
  transcription: string;
  definitions: string[];
  examples: string[];
  notes: string;
  createdAt: number;
  learned: boolean;
  sourceDictName: string | null;
  sourceHeadword: string | null;
  collectionIds: string[];   // denormalized for convenience
}
```

---

### `update_card`

Update mutable fields of an existing card.

**Args**:
```typescript
{
  id: string;
  notes?: string;
  learned?: boolean;
}
```

**Returns**: `Card` (updated)

**Errors**: `"Card not found"` if id is invalid.

---

### `delete_card`

Delete a card permanently. Also removes all its collection assignments.

**Args**:
```typescript
{ id: string }
```

**Returns**: `void`

**Errors**: `"Card not found"` if id is invalid.

---

## Collection Commands

### `create_collection`

**Args**:
```typescript
{ name: string }
```
- `name`: 1–100 chars after trim; must be unique (case-insensitive).

**Returns**: `Collection`
```typescript
interface Collection {
  id: string;
  name: string;
  createdAt: number;
  cardCount: number;
}
```

**Errors**: `"Collection name already exists"` on duplicate.

---

### `rename_collection`

**Args**:
```typescript
{ id: string; name: string }
```

**Returns**: `Collection` (updated)

**Errors**: `"Collection not found"`, `"Collection name already exists"`.

---

### `delete_collection`

Delete a collection. Cards remain in the library (FR-012).

**Args**:
```typescript
{ id: string }
```

**Returns**: `void`

**Errors**: `"Collection not found"`.

---

### `assign_card_to_collection`

**Args**:
```typescript
{ cardId: string; collectionId: string }
```

**Returns**: `void`

**Errors**: `"Card not found"`, `"Collection not found"`. Idempotent — no error if already assigned.

---

### `remove_card_from_collection`

**Args**:
```typescript
{ cardId: string; collectionId: string }
```

**Returns**: `void`

Idempotent — no error if not assigned.

---

## Review Commands

### `start_review_session`

Create a session record and return a shuffled deck.

**Args**:
```typescript
{ collectionId?: string }
```
- `collectionId`: if omitted, session covers the full card library.

**Returns**: `ReviewSession`
```typescript
interface ReviewSession {
  id: string;
  cards: Card[];         // shuffled
  collectionId: string | null;
  startedAt: number;
}
```

**Errors**: `"Collection not found"`, `"No cards available for review"` (empty deck — FR-013 edge case).

---

### `end_review_session`

Finalize the session record with summary counts.

**Args**:
```typescript
{
  sessionId: string;
  learnedCount: number;
  notLearnedCount: number;
}
```

**Returns**: `SessionSummary`
```typescript
interface SessionSummary {
  sessionId: string;
  totalCards: number;
  learnedCount: number;
  notLearnedCount: number;
  durationSeconds: number;
}
```
