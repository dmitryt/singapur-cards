# Tauri Command Contracts: Language Management

All commands follow the existing `CommandSuccess<T>` / `CommandFailure` envelope pattern used throughout the app.

**Success envelope:**
```json
{ "ok": true, "data": <T> }
```

**Failure envelope:**
```json
{ "ok": false, "code": "<ERROR_CODE>", "message": "<description>" }
```

---

## list_languages

Lists all stored languages, ordered by title ascending.

**Input:** none

**Output (success):**
```typescript
CommandSuccess<Language[]>

type Language = {
  code: string;       // 2 lowercase letters, e.g. "en"
  title: string;      // e.g. "English"
  createdAt: string;  // ISO 8601
};
```

**Output (failure):** `UNEXPECTED_ERROR`

---

## create_language

Creates a new language. Rejects duplicates and invalid codes.

**Input:**
```typescript
type CreateLanguageInput = {
  code: string;   // must match /^[a-z]{2}$/
  title: string;  // must be non-empty
};
```

**Output (success):** `CommandSuccess<Language>` — the newly created language

**Output (failure):**

| code            | when                                      |
|-----------------|-------------------------------------------|
| `INVALID_INPUT` | code not exactly 2 lowercase ASCII letters; or title empty |
| `CONFLICT`      | a language with that code already exists  |
| `PERSISTENCE_FAILED` | DB write error                       |

Note: `CONFLICT` uses the `ConflictFailure` envelope:
```json
{ "ok": false, "code": "CONFLICT", "message": "...", "existingCardId": "<code>" }
```
(field name is `existingCardId` to match existing type — value holds the conflicting language code)

---

## update_language

Updates the title of an existing language. Code is immutable.

**Input:**
```typescript
type UpdateLanguageInput = {
  code: string;   // identifies the language to update
  title: string;  // new title, must be non-empty
};
```

**Output (success):** `CommandSuccess<Language>` — the updated language

**Output (failure):**

| code            | when                           |
|-----------------|--------------------------------|
| `INVALID_INPUT` | title is empty                 |
| `NOT_FOUND`     | no language with that code     |
| `PERSISTENCE_FAILED` | DB write error            |

---

## delete_language

Deletes a language by code. Refuses if it is the last language.

**Input:** `code: string` (query param / positional)

**Output (success):** `CommandSuccess<{ deletedCode: string }>`

**Output (failure):**

| code            | when                                          |
|-----------------|-----------------------------------------------|
| `INVALID_INPUT` | Cannot delete the last language               |
| `NOT_FOUND`     | no language with that code                    |
| `PERSISTENCE_FAILED` | DB write error                           |

---

## list_headwords_for_language

Returns distinct headwords for dictionaries whose `language_from` matches the given code, alphabetically sorted.

**Input:**
```
language: string   // ISO 639-1 code
limit?: number     // default 2000
```

**Output (success):** `CommandSuccess<string[]>`

**Output (failure):** `UNEXPECTED_ERROR`
