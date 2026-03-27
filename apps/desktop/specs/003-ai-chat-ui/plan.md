# Implementation Plan: AI Chat for Vocabulary Practice

**Branch**: `003-ai-chat-ui` | **Date**: 2026-03-27 | **Spec**: `/Users/gremlin/projects/singapur-cards/apps/desktop/specs/003-ai-chat-ui/spec.md`  
**Input**: Feature specification from `/Users/gremlin/projects/singapur-cards/apps/desktop/specs/003-ai-chat-ui/spec.md`

## Summary

Add an online AI chat flow to the desktop app where users can send prompts, pick one vocabulary collection (or no collection), explicitly pick a model before first send, provide a personal OpenRouter API key, and see per-message token usage. The implementation follows existing architecture — React + Zustand for control state, Tauri Rust commands for chat/key handling, typed command wrappers for frontend/backend boundaries — with `@assistant-ui/react` headless primitives for the chat UI layer connected via `useExternalStoreRuntime`. The Vercel AI SDK is not used.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18) + Rust 2021 (Tauri v2)  
**Primary Dependencies**: `react`, `zustand`, `@assistant-ui/react`, `@tauri-apps/api`, `semantic-ui-react`, `styled-components`, `tauri`, `serde`, `reqwest` or equivalent Rust HTTP client for provider calls  
**Storage**: Local application state; optional persisted chat history is out of scope for v1  
**Testing**: Vitest + Testing Library for UI/state; Rust unit/integration tests for command behavior  
**Target Platform**: Desktop via Tauri (macOS/Windows/Linux target set by project)  
**Project Type**: Desktop application (React UI + Rust command layer)  
**Performance Goals**: 95% of successful prompts return a visible response within 10 seconds under normal network conditions  
**Constraints**: No app-provided fallback credential in v1; chat requests require a saved user OpenRouter key; no raw key pass-through in chat requests; recoverable failure states; keep app usable on network errors  
**Scale/Scope**: Single-user desktop usage, single active chat session in v1, one selected collection or no collection

OpenRouter free-router models are allowed in v1, but OpenRouter authentication still requires a user-provided API key.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Desktop-First Experience**: PASS. Chat actions will remain keyboard/mouse friendly with explicit loading/error affordances.
- **II. Local Data Safety**: PASS. No destructive local data behavior is required; no implicit deletion/overwrite.
- **III. Stable Offline Behavior**: PASS WITH EXPLICIT EXCEPTION. AI chat is explicitly online-only, but failure handling must be graceful and non-blocking for the rest of the app.
- **IV. Basic Quality Gates**: PASS. Plan includes automated and/or manual verification paths for changed behavior.
- **V. Keep It Simple**: PASS. v1 excludes optional features (history persistence, regenerate, temperature controls) to minimize complexity.

## Project Structure

### Documentation (this feature)

```text
apps/desktop/specs/003-ai-chat-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ai-chat-command-contract.md
│   └── credential-storage-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/desktop/
├── src/
│   ├── components/
│   ├── pages/
│   ├── store/
│   │   └── slices/
│   └── lib/
│       └── tauri/
├── src-tauri/
│   └── src/
│       ├── commands/
│       └── lib.rs
└── src/test/
```

**Structure Decision**: Keep the existing single desktop app structure. Add chat UI/state on the React side and add new Tauri command module + command registration on the Rust side, following existing command wrapper patterns.

## Phase 0: Outline & Research

1. Validate single-provider OpenRouter integration approach and response schema for model output + token usage.
2. Define required-user-key behavior and secure key handling rules with strict non-exposure guarantees.
3. Define no-collection and empty-collection context behavior and prompt shaping boundaries.
4. Confirm UX patterns for loading, retry, and error messaging consistent with current pages.

**Output**: `research.md` with implementation decisions and alternatives.

## Phase 1: Design & Contracts

1. Define data model for chat controls, token usage rendering support, and key-backed chat authorization.
2. Define Tauri command contracts and typed frontend wrapper contracts for chat + API key persistence.
3. Define quickstart validation flow for manual + automated checks.
4. Attempt agent-context update script and record result.
5. Re-check Constitution alignment after design decisions.

**Output**: `data-model.md`, `contracts/ai-chat-command-contract.md`, `contracts/credential-storage-contract.md`, `quickstart.md`

## Phase 2: Task Planning Input

Prepare implementation task sequencing for `/speckit.tasks`:
- Setup: install `@assistant-ui/react`; define domain types compatible with the adapter's `ThreadMessage` conversion; define constants including `SUPPORTED_MODELS`.
- Foundation: Rust command module; Zustand chat slice (including `tokenUsageByMessageId: Record<string, TokenUsage>` and model/key readiness controls); `useExternalStoreRuntime` adapter (`useChatRuntime`) that bridges assistant-ui runtime to app state and implements `onNew` (reads `selectedCollectionId` and `selectedModel` from Zustand; calls `sendChatMessage` Tauri command without raw API key pass-through; writes response token usage back to slice).
- Core: wire `AssistantRuntimeProvider` + headless primitives (`ThreadPrimitive`, `ComposerPrimitive`, `MessagePrimitive`) into `ChatPage`; custom `AssistantMessage` component renders content + token usage from `tokenUsageByMessageId`.
- Controls: collection/model selectors outside the runtime (plain Zustand state); vocabulary context injected in `onNew` adapter callback.
- Reliability: error state via `lastErrorMessage` in slice; recoverable error display in `ChatPage`.
- Persistence: keychain-backed API key commands only; no credential metadata catalog or language/settings persistence in this feature.
- Verification: unit tests and manual acceptance checklist.

**Key architectural constraint**: The `useExternalStoreRuntime` adapter (`useChatRuntime.ts`) is the single point where Zustand state, Tauri commands, and the assistant-ui runtime meet. Message list, loading state, and composer behavior are owned by the runtime. Zustand owns `selectedModel`, `selectedCollectionId`, `tokenUsageByMessageId`, and `lastErrorMessage` only.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Online-only feature exception (Constitution III) | AI inference requires remote provider calls | Simulating local model behavior is out of scope and would not satisfy user-requested AI chat behavior |
| Keychain plugin for API key storage (Constitution V) | Secure desktop secret storage is required for user-provided OpenRouter keys | Storing keys in app state or local DB increases exposure risk and violates local safety goals |
