### Feature: Languages

#### 1. Overview
- Languages defines the managed list of learning/search languages in the app.
- It owns language CRUD and validation rules.
- Active language selection itself is handled by `user-profile.md`.

#### 2. Goals & Non-Goals
- Goals:
  - Provide create, read, update, and delete operations for languages.
  - Enforce stable ISO-style language code validation and uniqueness.
  - Ensure at least one language is always present.
- Non-Goals:
  - Profile-level active language selection UX.
  - Dictionary import/search behavior details (covered in `dictionaries.md`).

#### 3. User Stories
- A learner adds a language with code and title.
- A learner edits a language title without changing code.
- A learner removes a language safely when more than one exists.

#### 4. Functional Requirements
- Language code must be exactly two lowercase letters.
- Duplicate language codes are rejected.
- Language title is required.
- Language code is immutable after creation.
- Last remaining language cannot be deleted.

#### 5. UX / UI Description
- Dedicated Languages page lists all languages.
- Add/edit actions are form-based with inline validation.
- Remove action is disabled or hidden when only one language remains.
- Delete flow includes explicit confirmation.

#### 6. Data Model + Database Schema
```ts
type Language = {
  code: string // /^[a-z]{2}$/
  title: string
  createdAt: string
}
```
- SQLite table: `languages`.
- Seeded default language is inserted on first run.

#### 7. API / Integration
- `list_languages`
- `create_language`
- `update_language`
- `delete_language`
- `list_headwords_for_language` consumes the selected code in search-related flows.

#### 8. State Management
- Language slice caches list of available languages.
- CRUD actions update local list state immediately after successful command responses.
- Validation failures should not mutate existing state.

#### 9. Storage
- Languages persist in local SQLite.
- Seed behavior ensures non-empty baseline state.
- No remote service dependency.

#### 10. Platforms
- Desktop: implemented target.
- Mobile: planned only in this repository.

#### 11. Permissions & Security
- No secret data involved in language management.
- Local-only data operations reduce exposure surface.

#### 12. Error Handling
- `INVALID_INPUT` for malformed codes or empty titles.
- `CONFLICT` for duplicate codes.
- `NOT_FOUND` for stale update/delete targets.
- Last-language delete attempt returns recoverable validation error.

#### 13. Analytics
- Not explicitly specified.
- Suggested metrics:
  - create/update/delete success rates
  - validation failure rates by rule
  - duplicate-code rejection count

#### 14. Open Questions
- Should language ordering be user-configurable?
- Should language records include locale metadata (flag/native name)?
- Should language delete support reassignment options for dependent views?

#### 15. Future Improvements
- Add language presets/import bundles.
- Add richer locale metadata and sorting preferences.
- Add migration tooling for language normalization changes.
