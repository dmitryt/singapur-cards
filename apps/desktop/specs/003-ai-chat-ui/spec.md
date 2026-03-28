# Feature Specification: AI Chat for Vocabulary Practice

**Feature Branch**: `003-ai-chat-ui`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Implement AI-powered chat for desktop language learning with selected collection context, required model selection, user-provided OpenRouter API key, and token usage display."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start and Use Chat (Priority: P1)

A learner opens the chat interface, writes a prompt, sends it, and receives a useful assistant response in the same conversation.

**Why this priority**: This is the core value of the feature. Without a reliable send/receive chat flow, no educational benefit is delivered.

**Independent Test**: Can be fully tested by opening chat with a saved API key and an explicitly selected model, sending a prompt, receiving a response, and confirming both messages are visible in the message list.

**Acceptance Scenarios**:

1. **Given** the learner is on the chat screen, **When** they enter a prompt and send it, **Then** their message appears in the thread and a response is returned in the same thread.
2. **Given** a response is being generated, **When** the learner observes the chat, **Then** the interface shows a clear loading state until the response is complete or fails.
3. **Given** generation fails, **When** the request finishes, **Then** the learner sees a clear error state and can send another prompt without restarting the app.

---

### User Story 2 - Control Context and Model (Priority: P2)

A learner chooses one vocabulary collection (or no collection) and selects an AI model so responses match their desired vocabulary focus and model preference.

**Why this priority**: Context and model control significantly influence response quality and trust, but they depend on the core chat loop in Story 1.

**Independent Test**: Can be tested by saving an API key, explicitly selecting a model, changing collection/model before send, and verifying generated responses reflect the chosen context and model selection.

**Acceptance Scenarios**:

1. **Given** the learner has one or more collections, **When** they select a collection and send a prompt, **Then** the chat request includes vocabulary context derived from that selected collection.
2. **Given** the learner chooses "no collection", **When** they send a prompt, **Then** the request is sent without vocabulary collection context and still produces a valid response.
3. **Given** the learner changes to a different model, **When** they send the next prompt, **Then** the new model selection is applied to that request.

---

### User Story 3 - Configure API Key and Understand Usage (Priority: P3)

A learner saves a personal OpenRouter API key, uses chat safely without exposing secret values, and sees per-message token usage including a clear missing-usage state.

**Why this priority**: Cost transparency and predictable credential behavior are essential for confidence and ongoing use, but they are secondary to delivering a functional conversation.

**Independent Test**: Can be tested by verifying send is disabled without a saved key, sending with a valid saved key, testing invalid-key failure recovery, and checking per-message token metrics.

**Acceptance Scenarios**:

1. **Given** the learner has not saved an API key, **When** they open chat, **Then** send is disabled and the UI shows how to configure the key in Profile.
2. **Given** the learner has saved a valid personal OpenRouter API key, **When** they send a prompt, **Then** the request succeeds without exposing key material in any UI output.
3. **Given** the learner's saved key is invalid or expired, **When** they send a prompt, **Then** the UI shows a recoverable error and instructs them to update or clear the key.
4. **Given** a response is returned with usage metadata, **When** the assistant message is shown, **Then** prompt, completion, and total token counts are visible for that message.
5. **Given** a response is returned without usage metadata, **When** the assistant message is shown, **Then** a `Usage unavailable` label is shown for that message.

---

### Edge Cases

- Learner sends an empty or whitespace-only prompt.
- Selected collection exists but contains no words.
- Selected collection is deleted or becomes unavailable between selection and send.
- Requested model is unavailable or rejected by the provider.
- User-provided API key is invalid, expired, or lacks permission.
- Provider returns a response without token usage metadata.
- Network failure or timeout occurs during response generation.
- Learner uninstalls the app without clearing their API key — the key remains in the OS keychain and is not automatically removed; re-installing restores access to the same key.
- No model has been selected yet when the learner attempts to send a prompt.
- No API key has been configured yet when the learner opens chat.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a chat interface where learners can view conversation history, compose prompts, and send messages.
- **FR-002**: System MUST display user and assistant messages in chronological order within a single active conversation view.
- **FR-003**: System MUST show a clear in-progress state while awaiting an assistant response.
- **FR-004**: System MUST allow the learner to choose one vocabulary collection as contextual input for chat requests.
- **FR-005**: System MUST allow the learner to continue chat without selecting any collection.
- **FR-006**: System MUST include vocabulary context from the selected collection in the request when a collection is selected.
- **FR-007**: System MUST let the learner choose an AI model from a static list of OpenRouter-supported models defined in application constants before sending a message.
- **FR-007a**: System MUST NOT preselect a default model; the learner must explicitly choose a model before the first send.
- **FR-008**: System MUST require a learner-provided OpenRouter API key for chat requests in v1.
- **FR-008a**: System MUST provide a masked text field on the Profile page where the learner can enter, save, and clear a personal API key.
- **FR-008b**: System MUST store raw key material only in the OS credential store and MUST NOT write raw key material to SQLite or application logs.
- **FR-009**: System MUST disable send and show setup guidance when no learner-provided key exists.
- **FR-010**: System MUST show a clear recoverable error when a saved key is invalid, expired, or unauthorized, and allow retry after key update.
- **FR-011**: System MUST display per-assistant-message usage metrics for prompt tokens, completion tokens, and total tokens when available.
- **FR-011a**: System MUST display `Usage unavailable` for assistant messages that do not include usage metadata.
- **FR-012**: System MUST present a clear recoverable error message when a chat request fails and allow the learner to try again.
- **FR-013**: System MUST ensure the current model selection, collection selection, and key-availability checks are applied to each outgoing prompt.

### Key Entities *(include if feature involves data)*

- **ChatSession**: Represents the conceptual active conversation context containing ordered messages and current chat controls. In v1, assistant-ui runtime owns the rendered thread state rather than a separate app-owned `ChatSession` store model.
- **ChatMessage**: Represents the conceptual learner/assistant message unit with content, role, timestamp, and optional usage metrics. In v1, assistant-ui runtime owns rendered thread messages, while the app stores token usage separately in Zustand.
- **VocabularyContextSelection**: Represents the learner's selected collection identifier or explicit no-collection mode for request context.
- **ModelSelection**: Represents the learner's explicitly chosen OpenRouter model for subsequent chat requests.
- **UserApiKey**: Represents the personal OpenRouter API key entered by the learner on the Profile page. Stored in the OS credential store (system keychain via `tauri-plugin-keyring`), never in SQLite, and written back on explicit save.
- **TokenUsage**: Represents prompt token count, completion token count, and total token count associated with an assistant response.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 95% of valid prompts receive an assistant response visible in the same conversation in under 10 seconds under normal network conditions.
- **SC-002**: 100% of tested chat requests honor the selected context mode (single selected collection or no-collection mode) for that request.
- **SC-003**: 100% of tested chat requests honor the currently selected model at send time.
- **SC-004**: 100% of tested chat screens without a saved key disable send and show key-setup guidance.
- **SC-005**: In 100% of tested successful responses that include usage data, prompt, completion, and total token values are shown with the related assistant message.
- **SC-005a**: In 100% of tested successful responses that omit usage data, `Usage unavailable` is shown for that message.
- **SC-006**: In 100% of simulated failure cases, the learner is shown an actionable error state and can send another prompt without restarting the application.

## Assumptions

- Learners can access existing vocabulary collections already managed by the application.
- At least one AI model option is available whenever chat is enabled.
- OpenRouter free-router models may be used in v1, but OpenRouter authentication still requires a user-provided API key.
- Persisted multi-session history, regenerate actions, response creativity tuning, and advanced streaming behavior are out of scope for this version.
- The chat UI is built using `@assistant-ui/react` headless primitives (`ThreadPrimitive`, `ComposerPrimitive`, `MessagePrimitive`) styled with styled-components. The Vercel AI SDK is not used. The Zustand store is connected to the assistant-ui runtime via `useExternalStoreRuntime`.
- Token usage metadata is not part of the assistant-ui message model; it is stored in a separate Zustand map (`tokenUsageByMessageId`) and rendered by a custom message component.
- `userApiKey` is stored exclusively in the OS credential store via `tauri-plugin-keyring`. It is never written to SQLite or exposed in any log or UI state beyond the masked input field.
