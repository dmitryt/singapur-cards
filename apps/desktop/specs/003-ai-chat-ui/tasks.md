# Tasks: AI Chat for Vocabulary Practice

**Input**: Design documents from `/Users/gremlin/projects/singapur-cards/apps/desktop/specs/003-ai-chat-ui/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`

**Tests**: Include automated tests for frontend store/UI behavior and Rust command behavior, plus manual quickstart verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`)
- Every task includes an exact repository file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare feature scaffolding and routing points used by all stories.

- [ ] T001 [Setup] Create chat domain types in `apps/desktop/src/features/chat/types.ts` (`TokenUsage`, `ChatRequest`, `ChatResponse`, and any request-only vocabulary context types). Do not define runtime-owned `ChatSession`/`ChatMessage` app state types in v1; assistant-ui runtime owns thread messages, while Zustand stores only `selectedModel`, `selectedCollectionId`, `lastErrorMessage`, and `tokenUsageByMessageId`.
- [ ] T002 [P] [Setup] Create chat feature constants (supported model list, no-collection label, error copy keys) in `apps/desktop/src/features/chat/constants.ts` — `SUPPORTED_MODELS` is the authoritative source for FR-007; do not define a default model
- [ ] T003 [Setup] Add chat page route in `apps/desktop/src/App.tsx` and register `ChatPage` path
- [ ] T004 [P] [Setup] Create chat page shell component in `apps/desktop/src/pages/ChatPage.tsx` (empty layout placeholder wired for later tasks)
- [ ] T037 [P] [Setup] Install `@assistant-ui/react` in `apps/desktop/package.json` (`npm install @assistant-ui/react`) — no Tailwind; headless primitives only, styled with styled-components

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared command/store foundations that all user stories depend on.

**CRITICAL**: No user story work starts until this phase is complete.

- [ ] T005 [Foundation] Add chat command module and exports in `apps/desktop/src-tauri/src/commands/chat.rs` and `apps/desktop/src-tauri/src/commands/mod.rs`
- [ ] T006 [Foundation] Register `send_chat_message` invoke handler in `apps/desktop/src-tauri/src/lib.rs`
- [ ] T007 [Foundation] Add frontend command types + `sendChatMessage` Tauri wrapper in `apps/desktop/src/lib/tauri/commands.ts` per contract — this wrapper is called from the `useExternalStoreRuntime` adapter's `onNew` callback (T038), not directly from store actions
- [ ] T008 [Foundation] Create Zustand chat slice (`selectedModel`, `selectedCollectionId`, `lastErrorMessage`, `tokenUsageByMessageId`) in `apps/desktop/src/store/slices/chatSlice.ts` — assistant-ui runtime owns `messages` and loading state; Zustand only owns selectors and side maps used by the adapter/UI
- [ ] T009 [Foundation] Compose chat slice into app store in `apps/desktop/src/store/index.ts`
- [ ] T038 [Foundation] Implement `useExternalStoreRuntime` adapter in `apps/desktop/src/features/chat/useChatRuntime.ts`: runtime owns message list/loading; implement `onNew` callback that reads `selectedCollectionId` and `selectedModel` from Zustand, extracts vocabulary words from `collectionSlice`, and invokes `sendChatMessage` with `provider: "openrouter"` as a hardcoded constant (v1 single-provider) — raw API key is never passed from frontend; on `KEY_REQUIRED` or `NOT_FOUND` error write `lastErrorMessage`; on success write `tokenUsage` to `tokenUsageByMessageId`; reject early if `selectedModel` is null
- [ ] T010 [P] [Foundation] Add chat slice unit tests for Zustand-owned state only: `selectedModel`, `selectedCollectionId`, `tokenUsageByMessageId` population, and `lastErrorMessage` in `apps/desktop/src/test/chatSlice.test.ts` — do not test message list order or loading state (owned by assistant-ui runtime)
- [ ] T011 [P] [Foundation] Add Rust command unit tests for input validation and safe error payload mapping in `apps/desktop/src-tauri/src/commands/chat.rs`

**Checkpoint**: Command boundary and chat state foundation are complete; user stories may proceed.

---

## Phase 3: User Story 1 - Start and Use Chat (Priority: P1) 🎯 MVP

**Goal**: Learner can send prompts, receive assistant responses in-order, see loading, and recover from failures.

**Independent Test**: Open chat page with a saved API key and an explicitly selected model, send a valid prompt, observe user+assistant messages in same thread; force a failing request and confirm recoverable error + subsequent successful send.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add UI test for chronological message rendering in `apps/desktop/src/test/ChatPage.test.tsx`
- [ ] T013 [P] [US1] Add UI test for loading and recoverable error states in `apps/desktop/src/test/ChatPage.test.tsx`
- [ ] T042 [P] [US1] Add UI test ensuring send is disabled until both an API key exists and a model is explicitly selected in `apps/desktop/src/test/ChatPage.test.tsx`

### Implementation for User Story 1

- [ ] T014 [US1] Wire `AssistantRuntimeProvider` + `useChatRuntime` (from T038) into `apps/desktop/src/pages/ChatPage.tsx`; compose `ThreadPrimitive.Root`, `ThreadPrimitive.Viewport`, `MessagePrimitive` list, and `ComposerPrimitive` using headless primitives from `@assistant-ui/react`, styled with styled-components — no Tailwind
- [ ] T015 [US1] Empty/whitespace prompt rejection is handled natively by `ComposerPrimitive.Send` (disabled when input is empty) — add Tauri-boundary guard only: trim `prompt` and reject empty string before the `invoke` call in the adapter (`apps/desktop/src/features/chat/useChatRuntime.ts`)
- [ ] T017 [US1] Implement Rust command request execution and response mapping in `apps/desktop/src-tauri/src/commands/chat.rs`
- [ ] T018 [US1] Add custom `AssistantMessage` component in `apps/desktop/src/components/organisms/AssistantMessage.tsx` using `MessagePrimitive.Root` + `MessagePrimitive.Content` from `@assistant-ui/react`, styled with styled-components; reads `tokenUsageByMessageId[message.id]` from Zustand via `useMessage(m => m.id)` to conditionally render `<TokenUsageDisplay />` below message content
- [ ] T043 [US1] Implement chat gating UI in `apps/desktop/src/pages/ChatPage.tsx`: disable send and show setup guidance when no API key is saved or no model is selected

**Checkpoint**: US1 is functional and testable independently.

---

## Phase 4: User Story 2 - Control Context and Model (Priority: P2)

**Goal**: Learner selects one model and one collection (or no collection) and each prompt applies current selections.

**Independent Test**: Save an API key, explicitly select a model, change model and collection mode, send a prompt, and verify payload selection state is applied per request.

### Tests for User Story 2

- [ ] T019 [P] [US2] Add store test ensuring selected model/collection are captured at send time in `apps/desktop/src/test/chatSlice.test.ts`
- [ ] T020 [P] [US2] Add Rust command test covering `selectedCollectionId = null` no-context mode in `apps/desktop/src-tauri/src/commands/chat.rs`
- [ ] T044 [P] [US2] Add adapter unit test for `useChatRuntime` in `apps/desktop/src/test/useChatRuntime.test.ts` verifying `selectedCollectionId` is resolved against `collectionSlice`, empty/missing collections degrade to no-context, and `vocabularyContext` is included in the outgoing `ChatRequest` payload when applicable

### Implementation for User Story 2

- [ ] T021 [US2] Add model selector UI (options from `SUPPORTED_MODELS` constant) and state binding in `apps/desktop/src/pages/ChatPage.tsx` with no default preselection
- [ ] T022 [US2] Add collection context selector UI with explicit "No collection" mode in `apps/desktop/src/pages/ChatPage.tsx`
- [ ] T023 [US2] Vocabulary context extraction is implemented inside the adapter's `onNew` callback (T038) in `apps/desktop/src/features/chat/useChatRuntime.ts`: read `selectedCollectionId` from Zustand, fetch word list from `collectionSlice`, include as `vocabularyContext` in the `ChatRequest` payload — verify this in `T044`
- [ ] T024 [US2] Implement no-collection and empty/unavailable-collection behavior in `apps/desktop/src-tauri/src/commands/chat.rs`: if `selectedCollectionId` is null proceed without context; if set but collection is empty or unavailable return `NOT_FOUND` error — do NOT silently degrade to no-context

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Configure API Key and Understand Usage (Priority: P3)

**Goal**: Learner configures a personal OpenRouter API key, receives clear invalid-key guidance, and sees per-assistant token usage states without key exposure.

**Independent Test**: Verify send is blocked without a key, verify valid-key successful send path, verify invalid-key recoverable error path, and verify usage metrics/`Usage unavailable` rendering.

### Tests for User Story 3

- [ ] T025 [P] [US3] Add Rust command test for required-key behavior, invalid-key error mapping, and non-persistence guarantees in `apps/desktop/src-tauri/src/commands/chat.rs` and related key-storage tests: verify raw API key material is never written to SQLite and is excluded from application log payloads
- [ ] T026 [P] [US3] Add UI test for token usage rendering and `Usage unavailable` label behavior in `apps/desktop/src/test/ChatPage.test.tsx`

### Implementation for User Story 3

- [ ] T039 [US3] Add `tauri-plugin-keyring` to `apps/desktop/src-tauri/Cargo.toml`; register plugin in `apps/desktop/src-tauri/src/lib.rs`; create `ai_credentials` SQLite migration (non-secret metadata: `id`, `provider`, `is_active`, `label`, `created_at`, `updated_at`); implement `save_api_credential`, `get_api_credential`, `delete_api_credential` commands in `apps/desktop/src-tauri/src/commands/api_key.rs` per `credential-storage-contract.md` — v1 enforces one active credential per provider; `list_api_credentials` and `set_active_api_credential` are deferred
- [ ] T041 [P] [US3] Add typed frontend wrappers `saveApiCredential`/`getApiCredential`/`deleteApiCredential` in `apps/desktop/src/lib/tauri/commands.ts` per `credential-storage-contract.md`
- [ ] T027 [US3] Ensure the adapter `onNew` path in `apps/desktop/src/features/chat/useChatRuntime.ts` performs key-availability checks only and never passes raw API key values from frontend runtime
- [ ] T028 [US3] Enforce no-fallback credential behavior in `apps/desktop/src-tauri/src/commands/chat.rs`: if no user key is available, return a recoverable `API key required` error
- [ ] T029 [US3] Token usage rendering is implemented in `AssistantMessage.tsx` (T018) via `useMessage(m => m.id)` → `tokenUsageByMessageId` Zustand lookup → `<TokenUsageDisplay prompt completion total />`; show `Usage unavailable` when usage is null
- [ ] T030 [US3] Add safe user-facing OpenRouter/network error messages for key/model failures in `apps/desktop/src/pages/ChatPage.tsx`
- [ ] T036 [US3] Update `apps/desktop/src/store/slices/profileSlice.ts` to call `getApiCredential("openrouter")` at startup and cache `{ exists, maskedKey }` in slice state; update `apps/desktop/src/pages/ProfilePage.tsx` with a masked API key input field, explicit save action (calls `saveApiCredential`), and clear action (calls `deleteApiCredential`); no provider selector, credential catalog, or language-setting behavior in this feature

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Verification

**Purpose**: Final hardening, docs alignment, and acceptance validation across stories.

- [ ] T031 [P] [Polish] Add command wrapper tests/mocks for `send_chat_message` in `apps/desktop/src/test/__mocks__/@tauri-apps/api/core.ts` and related test files
- [ ] T032 [Polish] Ensure quickstart reflects final route/labels and validation steps in `apps/desktop/specs/003-ai-chat-ui/quickstart.md`
- [ ] T033 [Polish] Run full frontend test suite (`npm test`) and resolve regressions affecting changed chat/store files
- [ ] T034 [Polish] Run Rust tests for command module (`cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`) focused on chat command coverage
- [ ] T035 [Polish] Execute manual acceptance checklist from `apps/desktop/specs/003-ai-chat-ui/quickstart.md`, including confirmation that API keys are stored only in the OS keychain and do not appear in local DB contents or user-visible logs; record pass/fail notes in implementation PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (`Setup`) has no dependencies.
- Phase 2 (`Foundation`) depends on Phase 1 and blocks all story work.
- Phase 3 (`US1`), Phase 4 (`US2`), and Phase 5 (`US3`) depend on Phase 2 completion.
- Phase 6 (`Polish`) depends on all targeted stories being completed.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundation; no dependency on other stories.
- **US2 (P2)**: Starts after Foundation; may reuse US1 UI/store scaffolding but must remain independently testable.
- **US3 (P3)**: Starts after Foundation; depends on prior chat send pipeline and message rendering.
- Within US3: `T039` (Rust key commands) must complete before `T041` (frontend wrappers); `T041` should complete before `T036` (profile/profileSlice key UX wiring).

### Within Each Story

- Tests should be written before or alongside implementation and fail at least once before final pass.
- Store/command behavior precedes UI polish.
- Story checkpoint must pass before progressing.

### Parallel Opportunities

- `T002`, `T004`, and `T037` can run in parallel in Setup.
- `T041` can start once `T039` compiles.
- `T038` (adapter) can start once `T007` (Tauri wrapper) and `T008` (Zustand slice) are complete.
- `T010` and `T011` can run in parallel once foundational code compiles.
- `T012` and `T013`, `T019` and `T020`, `T025` and `T026` are parallel test tasks.
- `T044` can run in parallel with other US2 tests once `T038` is implemented.
- Cross-file tasks marked `[P]` can run concurrently when dependencies are satisfied.

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (`US1`) and validate independently.
3. Demo core chat send/receive with loading and recovery behavior.

### Incremental Delivery

1. Add `US1` (core chat loop).
2. Add `US2` (model/context controls).
3. Add `US3` (required API key + token visibility).
4. Finish with Polish and full quickstart validation.

### Coverage Notes

- FR-001/002/003/012: Covered by `T014`, `T018`, `T038`, `T030`.
- FR-004/005/006/007/013: Covered by `T021`-`T024`, `T038` (adapter `onNew`), `T044`.
- FR-007a/008/008a/008b/009/010: Covered by `T021`, `T039`, `T041`, `T027`, `T028`, `T036`, `T042`, `T043`, `T025`, `T035`.
- FR-011/011a: Covered by `T018`, `T026`, `T029`.
- assistant-ui integration: `T037` (install), `T038` (adapter + runtime wiring), `T014` (primitive composition), `T018` (custom message component).
- Persistence infrastructure: `T039` (keyring plugin + commands), `T041` (frontend wrappers).
- Success criteria validation is covered by test tasks (`T010`-`T013`, `T019`-`T020`, `T025`-`T026`) and polish verification (`T033`-`T035`).
