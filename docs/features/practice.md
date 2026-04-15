### Feature: Practice

#### 1. Overview
- Practice provides the active learning loop over saved cards.
- Sessions can target all cards or a selected collection.
- Outcomes update card learning state and persist across restarts.

#### 2. Goals & Non-Goals
- Goals:
  - Run sequential practice sessions with stable ordering semantics.
  - Capture learned/not-learned outcomes per card.
  - Persist practice progress locally.
- Non-Goals:
  - Spaced repetition scheduling algorithms.
  - Card content editing (covered in [Cards](./cards.md)).

#### 3. User Stories
- A learner starts a practice run and flips cards front/back.
- A learner marks each card as learned or not learned.
- A learner resumes app later and sees persisted practice status.

#### 4. Functional Requirements
- Start session optionally scoped to a collection.
- Return ordered session IDs: unreviewed, then not learned, then learned.
- Support flip interaction and next-card progression.
- Record results as `learned` or `not_learned`.
- Show explicit empty state when no cards are available.

#### 5. UX / UI Description
- Practice screen presents one card at a time.
- Front side prompts recall; back side reveals answer.
- Action controls mark outcomes and continue flow.
- Empty and completion states are explicit and actionable.

#### 6. Data Model + Database Schema
```ts
type ReviewEvent = {
  id: string
  cardId: string
  result: "learned" | "not_learned"
  reviewedAt: string
}
```
- SQLite table: `review_events`.
- Card `learning_status` reflects latest effective state.

#### 7. API / Integration
- `start_review_session`
- `record_review_result`
- `list_cards` can be used for practice preparation/filtering.
- Session ordering is backend-owned; clients should not resort.

#### 8. State Management
- Session state tracks current card index and ordered card IDs.
- Practice actions update both per-session progress and persisted status.
- Recoverable failures should keep session context when possible.

#### 9. Storage
- Results persist to SQLite in `review_events` and card status fields.
- No remote sync in MVP.

#### 10. Platforms
- Desktop: implemented target.
- Mobile: planned only.

#### 11. Permissions & Security
- No external service or secret storage required.
- Local persistence aligns with offline-first behavior.

#### 12. Error Handling
- Handle empty collection sessions gracefully.
- Handle stale/deleted card IDs during active session.
- Recover from write failures without app restart requirement.

#### 13. Analytics
- Not formally specified.
- Suggested metrics:
  - sessions completed per run
  - learned vs not-learned distribution
  - abandoned session rate

#### 14. Open Questions
- Should partial session progress snapshots be explicit in UI?
- Should practice history be queryable by time window?
- Should session randomization be seedable for testing/debug?

#### 15. Future Improvements
- Add spaced repetition schedules.
- Add difficulty labels and adaptive sequencing.
- Add progress dashboards over time.
