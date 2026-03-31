### Feature: Collections

#### 1. Overview
- Collections organize cards into learner-defined groups.
- A card can belong to multiple collections without data duplication.
- Collection operations are separate from card content editing.

#### 2. Goals & Non-Goals
- Goals:
  - Provide collection create/list/rename/delete.
  - Support stable card membership management.
  - Keep card records intact when a collection is removed.
- Non-Goals:
  - Review run-time sequencing (covered in [Reviews](./reviews.md)).
  - Card field editing (covered in [Cards](./cards.md)).

#### 3. User Stories
- A learner creates topical collections and assigns cards.
- A learner renames a collection without affecting card content.
- A learner deletes a collection and keeps underlying cards in library.

#### 4. Functional Requirements
- Create collection with unique name.
- List collections with basic metadata and card counts.
- Rename existing collections.
- Delete collections and cascade only membership rows.
- Preserve cards after collection deletion.

#### 5. UX / UI Description
- Collections page shows collection list and create controls.
- Collection detail view shows associated cards.
- Membership UI allows add/remove card links.
- Destructive actions require explicit confirmation.

#### 6. Data Model + Database Schema
```ts
type Collection = {
  id: string
  name: string
  description?: string
}

type CollectionMembership = {
  collectionId: string
  cardId: string
  createdAt: string
}
```
- SQLite tables: `collections`, `collection_memberships`.
- Membership uniqueness: composite key `(collection_id, card_id)`.

#### 7. API / Integration
- `create_collection`
- `list_collections`
- `rename_collection`
- `delete_collection`
- Card APIs accept/return `collectionIds` for membership updates.

#### 8. State Management
- Frontend collection slice caches list and current selection.
- Membership updates should sync card and collection views consistently.
- List refresh after create/rename/delete is required.

#### 9. Storage
- Collections and memberships are persisted in local SQLite.
- Deleting a collection removes memberships via cascade, not card rows.

#### 10. Platforms
- Desktop: implemented target.
- Mobile: planned only in current repository state.

#### 11. Permissions & Security
- No secret handling required.
- Local-only store; no shared account model in MVP.

#### 12. Error Handling
- Reject duplicate collection names.
- Not found handling for stale collection actions.
- Safe fallback when deleting non-empty collections.
- Persistence failures should not corrupt membership state.

#### 13. Analytics
- Not fully defined in specs.
- Suggested metrics:
  - collection create/delete rates
  - average cards per collection
  - membership add/remove failure rate

#### 14. Open Questions
- Should collections support custom ordering beyond name?
- Should there be hard limits for number of collections?
- Should deleting a collection offer reassignment options?

#### 15. Future Improvements
- Nested collections or smart collections.
- Collection-level study goals and progress rollups.
- Share/export collection definitions.
