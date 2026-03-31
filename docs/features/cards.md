### Feature: Cards

#### 1. Overview
- Cards are learner-owned study units created from `HeadwordDetail`.
- Card scope starts at creation from dictionary content and includes editing and library browsing.
- One card is allowed per `headword + language` pair.

#### 2. Goals & Non-Goals
- Goals:
  - Create cards quickly from headword detail.
  - Support card editing and persistence.
  - Prevent duplicate cards for the same vocabulary target.
- Non-Goals:
  - Collection lifecycle management (covered in [Collections](./collections.md)).
  - Review-session ordering and progression logic (covered in [Reviews](./reviews.md)).

#### 3. User Stories
- A learner saves a headword as a new card with prefilled answer data.
- A learner edits answer text, examples, notes, and pronunciation fields.
- A learner browses saved cards from the library view.
- A learner is redirected to existing card when attempting a duplicate save.

#### 4. Functional Requirements
- Create card from selected `headword`, `language`, and `sourceEntryIds`.
- Reject duplicate create by unique `headword + language`.
- Persist editable fields (`answerText`, `exampleText`, `notes`, `audioReference`).
- Return stable card IDs for navigation and update flows.

#### 5. UX / UI Description
- Card creation entrypoint is on the headword detail screen.
- Prefill values come from aggregated dictionary entries.
- Edit form supports save/cancel semantics with field-level validation.
- Library view lists cards and enables detail/edit navigation.

#### 6. Data Model + Database Schema
```ts
type Card = {
  id: string
  language: string
  headword: string
  answerText: string
  exampleText?: string
  notes?: string
  audioReference?: string
  sourceEntryIds: string[]
  learningStatus: "unreviewed" | "learned" | "not_learned"
}
```
- SQLite table: `cards`.
- Uniqueness constraint: `UNIQUE(headword, language)`.
- See `docs/data/sql-schemas.md` for canonical DDL.

#### 7. API / Integration
- `create_card_from_headword_detail`
- `get_card`
- `update_card`
- `delete_card`
- `list_cards`
- Structured conflict handling includes `existingCardId` for duplicate create attempts.

#### 8. State Management
- Frontend stores card lists and selected card detail in local slices.
- Optimistic updates are acceptable where rollback path is deterministic.
- Duplicate-create responses should navigate, not surface as generic error.

#### 9. Storage
- Cards are stored in local SQLite only.
- No remote backend dependency for create/update/delete/list.
- Provenance can be retained through `source_entry_ids`.

#### 10. Platforms
- Desktop: implemented target.
- Mobile: planned only; no runtime parity guaranteed in this repository.

#### 11. Permissions & Security
- No secret storage required for card operations.
- Local-only persistence minimizes data exposure.
- Deletion should require explicit confirmation in UI.

#### 12. Error Handling
- Validation errors for missing required card fields.
- Conflict error when duplicate `headword + language` save is attempted.
- Not found errors for stale navigation targets.
- Persistence failures show retry-safe error states.

#### 13. Analytics
- Not contractually specified.
- Suggested metrics:
  - card create success rate
  - duplicate-prevented create attempts
  - card edit completion rate

#### 14. Open Questions
- Should soft-delete/archive be added before permanent deletion?
- Should duplicate detection eventually normalize casing/whitespace?
- Should card history/versioning be captured for edits?

#### 15. Future Improvements
- Add bulk card actions (multi-select edit/delete).
- Add card tags and richer filtering.
- Add import/export support for personal card sets.
