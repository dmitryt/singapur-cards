### Feature: Models

#### 1. Overview
- Models feature manages user-saved AI model options used by chat.
- It owns custom model add/list/delete, provider filtering, ordering, and fallback behavior.
- Chat consumes selected model but does not own model catalog lifecycle.

#### 2. Goals & Non-Goals
- Goals:
  - Allow user-defined model records with provider association.
  - Keep model list deterministic and valid for chat selection.
  - Persist model choices across app restarts on device.
- Non-Goals:
  - Chat message delivery (covered in `ai-chat.md`).
  - API key management (covered in `user-profile.md`).

#### 3. User Stories
- A learner adds a custom model with identifier and title.
- A learner filters models by provider and removes outdated entries.
- A learner keeps chat usable when active model is deleted via fallback.

#### 4. Functional Requirements
- Require non-empty `name` and `title` on save.
- Enforce duplicate rejection by normalized identifier (trim + case-insensitive compare).
- Provider selection from fixed `SUPPORTED_PROVIDERS` list.
- Display user-saved models sorted alphabetically by title (case-insensitive).
- If active model is removed, fallback to first sorted remaining model or explicit empty state.

#### 5. UX / UI Description
- Dedicated Models page with provider selector and list.
- Add-model form/modal with save and cancel paths.
- Delete control per saved entry with immediate list refresh.
- Stable test IDs for model selector and add/delete controls.

#### 6. Data Model + Database Schema
```ts
type SavedModel = {
  name: string
  title: string
  provider: string
}
```
- SQLite table: `custom_chat_models`.
- Unique constraint on `name`.

#### 7. API / Integration
- `list_custom_models`
- `add_custom_model`
- `delete_custom_model`
- Chat model selector reads from saved model set.

#### 8. State Management
- `customModels` list loaded on feature entry.
- `selectedModel` shared with chat runtime.
- Update list immediately after mutation commands.

#### 9. Storage
- Device-local persistence in SQLite.
- No sync or server-side model storage in MVP.

#### 10. Platforms
- Desktop: implemented target.
- Mobile: not implemented in this repository.

#### 11. Permissions & Security
- Model records contain no secrets.
- Validation and controlled provider list reduce malformed entries.

#### 12. Error Handling
- Inline validation for empty fields.
- Duplicate save attempts return recoverable, non-destructive errors.
- Storage failures should preserve in-memory state integrity.

#### 13. Analytics
- Not explicitly specified.
- Suggested metrics:
  - model add/delete success rate
  - duplicate rejection count
  - fallback events after deletions

#### 14. Open Questions
- Should max identifier/title lengths be standardized in contract?
- Should delete operations require confirmation in all contexts?
- Should providers have provider-specific ID validation rules?

#### 15. Future Improvements
- Import/export model catalogs.
- Provider capability labels and health checks.
- Cross-device sync for model preferences.
