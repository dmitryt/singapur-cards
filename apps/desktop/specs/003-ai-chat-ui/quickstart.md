# Quickstart: AI Chat for Vocabulary Practice

## Prerequisites

- In `apps/desktop`, install dependencies and ensure Tauri dev environment is available.
- Have at least one collection available for context-mode testing.
- Configure an OpenRouter API key in Profile for send-path testing.

## Run

1. Start desktop app:
   - `npm run tauri dev`
2. Navigate to **AI Chat** in the sidebar (route: `/chat`).
3. Ensure model selector has at least one model option.
4. Keep a stopwatch/timer available for manual latency checks.

## Manual Verification Checklist

1. **Core chat flow**
   - With API key saved and model selected, enter prompt and send.
   - Confirm user message appears and assistant response appears in same thread.
2. **No-key and no-model gating**
   - Clear API key, return to chat, and confirm send is disabled with setup guidance to Profile.
   - Save API key but leave model unselected; confirm send remains disabled until model selection is explicit.
2. **Loading + error behavior**
   - Trigger a failing request (invalid/expired key or offline).
   - Confirm clear error message and ability to send a new prompt.
3. **Context mode**
   - Select a collection and send prompt; verify context mode is accepted.
   - Switch to no-collection mode and send again; verify request still succeeds.
   - Use an empty collection or deleted/unavailable selection and verify a `NOT_FOUND` recoverable error is shown (does NOT silently fall back to no-context).
4. **Model selection**
   - Explicitly choose a model and send a prompt.
   - Confirm request uses currently selected model.
5. **Token usage**
   - On successful response with usage, verify prompt/completion/total tokens are visible per assistant message.
   - On successful response without usage metadata, verify a `Usage unavailable` label appears.
6. **Manual latency target (SC-001)**
   - Run at least 20 valid prompts under normal network conditions and time each prompt from send click to visible assistant response.
   - Confirm at least 19/20 (95%) complete in under 10 seconds; record results in PR notes.

## Suggested Automated Checks

- Frontend unit/integration tests:
  - Message append ordering
  - Send disabled state without API key and without selected model
  - Loading and error state transitions
  - Token usage rendering including `Usage unavailable`
  - Model/context selection application at send time
- Rust command tests:
  - Required key behavior (no key -> recoverable `API key required`)
  - Invalid/expired key safe error mapping
  - Input validation for empty prompt/model
  - OpenRouter error mapping into safe app error payloads
