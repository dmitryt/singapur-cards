# Research: AI Chat for Vocabulary Practice

## Decision 1: Command Boundary and Response Shape

- **Decision**: Add a dedicated Tauri command for chat completion that accepts prompt text, selected model, selected collection id (nullable), and optional user API key; return assistant text plus token usage metadata.
- **Rationale**: Matches existing typed command wrapper pattern in `src/lib/tauri/commands.ts` and keeps provider integration details in Rust.
- **Alternatives considered**:
  - Call provider directly from React: rejected because fallback key secrecy cannot be guaranteed.
  - Reuse existing command endpoints: rejected because current commands are dictionary/card/review focused, not chat/inference focused.

## Decision 2: Credential Resolution Strategy

- **Decision**: Resolve credentials in Rust command layer using precedence: user-provided key -> fallback key; never return raw credential material to frontend.
- **Rationale**: Satisfies spec FR-008/FR-009/FR-010 and reduces accidental key exposure risks.
- **Alternatives considered**:
  - Resolve key source in frontend: rejected due to secret exposure and weaker trust boundary.
  - Require user key only: rejected because v1 explicitly supports fallback behavior.

## Decision 3: Vocabulary Context Mode

- **Decision**: Support exactly two context modes in v1: single selected collection id or no collection. If selected collection has no words, send prompt without collection vocabulary and surface a non-blocking notice.
- **Rationale**: Aligns with scope lock and keeps request logic deterministic.
- **Alternatives considered**:
  - Multi-collection merge in v1: rejected as additional complexity.
  - Block send on empty collection: rejected because it harms usability and conflicts with graceful fallback.

## Decision 4: Error and Offline Behavior

- **Decision**: Treat chat as explicitly online-only while maintaining app usability during failures; show recoverable error state with retry via next send action.
- **Rationale**: Satisfies constitution principle III through explicit online-only exception and graceful failure handling.
- **Alternatives considered**:
  - Hard-disable chat section on any transient error: rejected as too disruptive.
  - Retry indefinitely in background: rejected as opaque and harder to control.

## Decision 5: Testing Strategy

- **Decision**: Add frontend tests for state transitions and token rendering, plus Rust-side command tests for credential resolution and failure mapping.
- **Rationale**: Meets constitution principle IV quality gate with at least one verification path for user-facing behavior.
- **Alternatives considered**:
  - Manual test only: rejected as insufficient for regression protection.
  - Backend tests only: rejected because UI correctness (loading/errors/tokens) also needs coverage.
