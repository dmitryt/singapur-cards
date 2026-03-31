### Feature: AI Chat

#### 1. Overview
- AI Chat provides conversational vocabulary practice in-app.
- It owns prompt/response flow, context inclusion, loading/error states, and usage display.
- It depends on selected model (Models feature) and credential availability (User Profile feature).

#### 2. Goals & Non-Goals
- Goals:
  - Reliable send/receive conversational loop.
  - Apply selected collection context and model on each request.
  - Surface token usage where provided.
- Non-Goals:
  - Managing custom model catalog (covered in `models.md`).
  - Managing API key lifecycle (covered in `user-profile.md`).

#### 3. User Stories
- A learner sends prompts and receives assistant responses in thread order.
- A learner chats with selected collection context or no context.
- A learner understands usage metadata or clear unavailable state.

#### 4. Functional Requirements
- Sending requires non-empty prompt, selected model, and available credential.
- Request includes `prompt`, `model`, `provider`, and optional `selectedCollectionId`.
- In-progress state is visible while response is pending.
- Failures are recoverable without app restart.
- Usage metrics displayed per assistant message when metadata exists.

#### 5. UX / UI Description
- Chat thread displays user/assistant messages chronologically.
- Composer includes send action and status feedback.
- Controls include collection context and active model selection.
- Errors are actionable and allow immediate retry.

#### 6. Data Model + Database Schema
```ts
type ChatRequest = {
  prompt: string
  model: string
  provider: string
  selectedCollectionId: string | null
}

type ChatResponse = {
  assistantMessage: string
  tokenUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  } | null
}
```
- Optional persistence tables exist: `chat_conversations`, `chat_messages`.
- Credential metadata stored in `ai_credentials`; secret is keychain-only.

#### 7. API / Integration
- Main command: `send_chat_message`.
- Provider target: OpenRouter.
- Error codes include `INVALID_INPUT`, `NOT_FOUND`, `KEY_REQUIRED`, `UNEXPECTED_ERROR`.

#### 8. State Management
- Runtime state includes status (`idle`, `sending`, `error`) and last error.
- Message runtime handled by assistant-ui integration; token usage may be tracked in separate map.
- Selections are read at send time to avoid stale request context.

#### 9. Storage
- Chat can operate without requiring long-term transcript persistence.
- Where persisted, conversation/message rows are local SQLite records.
- No centralized backend dependency in current architecture.

#### 10. Platforms
- Desktop: implemented target.
- Mobile: planned only.

#### 11. Permissions & Security
- Raw API keys never sent from frontend to command as plaintext state.
- Rust resolves active credential internally by provider.
- No plaintext key in SQLite, logs, or UI model.

#### 12. Error Handling
- Missing credential returns `KEY_REQUIRED` with setup guidance.
- Missing/unavailable selected collection returns recoverable `NOT_FOUND`.
- Provider/network failures map to user-safe retryable errors.
- Missing token usage metadata maps to `Usage unavailable`, not failure.

#### 13. Analytics
- Not fully specified.
- Suggested metrics:
  - prompt send success/failure by code
  - latency from send to response
  - usage metadata presence rate

#### 14. Open Questions
- Should transcript persistence be product requirement in next iteration?
- Should provider selection be surfaced in chat UI beyond v1 constant?
- Should request/response streaming semantics be standardized in contract?

#### 15. Future Improvements
- Streaming partial responses and cancel actions.
- Multi-conversation management and history controls.
- Prompt templates and guided learning modes.
