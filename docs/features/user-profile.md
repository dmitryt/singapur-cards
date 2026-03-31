### Feature: User Profile

#### 1. Overview
- User Profile owns personal app settings that do not belong to content entities.
- In current scope, this includes active language selection and API key management.
- Language CRUD is intentionally out of scope for this document.

#### 2. Goals & Non-Goals
- Goals:
  - Let learner choose active language for global search filtering.
  - Let learner save/get/delete OpenRouter credential safely.
  - Keep profile actions lightweight and recoverable.
- Non-Goals:
  - Language create/edit/delete flows.
  - Chat message sending logic (covered in `ai-chat.md`).

#### 3. User Stories
- A learner sets active language from available options.
- A learner saves a personal API key in a masked form.
- A learner clears or updates key when invalid/expired.

#### 4. Functional Requirements
- Profile page provides active-language dropdown.
- Selected language updates store state used by search.
- Profile page supports:
  - `save_api_credential`
  - `get_api_credential`
  - `delete_api_credential`
- Key value is never shown in plaintext after save.

#### 5. UX / UI Description
- Profile screen shows:
  - active language selector
  - masked API key field and save/clear controls
- Validation and feedback are inline and actionable.
- No content-page search bar appears on profile screen.

#### 6. Data Model + Database Schema
```ts
type ProfileState = {
  selectedLanguage: string | null
  apiCredentialExists: boolean
  maskedKey: string | null
}
```
- Selected language references `languages` records.
- API credential metadata stored in `ai_credentials`.
- Raw key stored only in OS keychain.

#### 7. API / Integration
- Language context reads from language list command surface.
- Credential commands:
  - `save_api_credential`
  - `get_api_credential`
  - `delete_api_credential`
- AI chat command consumes profile credential state indirectly by provider.

#### 8. State Management
- `selectedLanguage` in frontend store drives dictionary search scope.
- Credential existence/masked status in profile state gates chat send affordance.

#### 9. Storage
- Active language selection lives in frontend runtime state (session behavior by current spec assumptions).
- Credential metadata persists in SQLite.
- Raw secret persists in keychain under provider/credential identity.

#### 10. Platforms
- Desktop: implemented target.
- Mobile: planned only; secure key management mechanism not implemented here.

#### 11. Permissions & Security
- Strict separation of secret metadata vs secret value.
- No plaintext secret in logs, SQLite, or frontend app state.
- Explicit delete path for credential removal.

#### 12. Error Handling
- Keychain unavailable/read/write/delete failures use safe user-facing messages.
- Missing credential state is non-crashing and recoverable.
- Invalid language selection should reset to valid default/fallback.

#### 13. Analytics
- Not specified in contracts.
- Suggested metrics:
  - key save/delete success rates
  - invalid credential recovery rate
  - active-language selection change frequency

#### 14. Open Questions
- Should active language persist across restarts?
- Should profile expose additional user preferences in MVP+?
- Should key validity check be explicit at save time?

#### 15. Future Improvements
- Add profile-level preferences (theme, review defaults, shortcuts).
- Add explicit credential health check action.
- Add multi-provider credential UX if provider support expands.
