# Feature Specification: Custom AI model management for chat

**Feature Branch**: `004-custom-ai-models`  
**Created**: 2026-03-29  
**Status**: Draft  
**Input**: User description: "Custom AI model management in chat: choose, add, persist, and remove user-defined models with validation and no duplicate model names." (derived from prompts/save-models-prompt.md)

## Clarifications

### Session 2026-03-29

- Q: How should duplicate detection normalize identifiers? → A: Trim leading and trailing whitespace; treat identifiers as duplicates when equal under case-insensitive comparison.
- Q: When the active model is removed, which fallback applies? → A: Use the product’s configured default model when one exists; otherwise the first model in the ordering defined in FR-012.
- Q: Is there a maximum number of user-saved custom models? → A: No cap required by this specification; unusually large lists may be handled in planning (performance UX), but blocking saves solely for count is out of scope unless added later.
- Q: How should the selectable list be ordered? → A: User-saved entries alphabetically by display title (case-insensitive).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a model for chat (Priority: P1)

When someone opens the chat experience, they see the models they can use for the conversation. They can pick one model from their saved entries. The choice applies to sending messages in that context without requiring a separate setup step.

**Why this priority**: Using the right model is the core reason for the feature; without selection, add/remove/persist have no user-visible value.

**Independent Test**: Open chat, add at least one model, select it, send a message (or observe that the app records the selection); confirms the primary workflow works.

**Acceptance Scenarios**:

1. **Given** the chat experience is open and at least one model is available, **When** the user selects a model, **Then** that model is the active choice for subsequent chat actions in that session until changed.
2. **Given** multiple models are listed, **When** the user switches selection, **Then** the newly selected model becomes active without losing other saved entries.

---

### User Story 2 - Add a custom model (Priority: P2)

A user can define a new model that is not already in their saved list by providing a stable machine-oriented identifier (for example, a provider path) and a short human-readable title. They confirm through an explicit save action in a dedicated step (such as a dialog). The new entry appears in the selectable list and remains available after closing and reopening the application on the same device.

**Why this priority**: Power users need to extend beyond a fixed catalog; persistence makes the effort worthwhile.

**Independent Test**: Add one custom model with valid fields, restart the application, open chat; the entry still appears and can be selected.

**Acceptance Scenarios**:

1. **Given** the user has entered a new identifier and title, **When** they confirm save, **Then** the model appears in the list and is persisted for future sessions on this device.
2. **Given** the add-model flow is open, **When** the user cancels or dismisses without saving, **Then** no new entry is created and the list is unchanged.
3. **Given** the user attempts to save with an identifier that already exists among saved entries after normalization, **When** they try to save, **Then** the system rejects it and does not create a conflicting entry.

---

### User Story 3 - Remove saved custom models (Priority: P3)

A user can remove a previously saved custom model through a clear delete affordance (for example, next to the item or via a small “manage models” view). After removal, the list updates immediately. If the removed entry was the active selection, the system selects a sensible fallback (another available model or a default from the app) so chat remains usable.

**Why this priority**: Users need to correct mistakes and retire outdated entries; it completes the lifecycle for saved data.

**Independent Test**: Save two custom models, remove one, confirm list and selection behavior; restart app and confirm the removed entry stays gone.

**Acceptance Scenarios**:

1. **Given** a saved custom model exists, **When** the user removes it, **Then** it disappears from the list and does not reappear after restart on the same device.
2. **Given** the active model is a custom entry, **When** the user removes that entry, **Then** the app switches to the fallback defined in FR-010 without leaving chat in a broken state when any model remains selectable.

---

### Edge Cases

- Identifier or title left empty: save is blocked with a clear indication of what is required.
- Duplicate identifier among saved entries after normalization (trim whitespace, case-insensitive comparison): save is blocked; existing entry unchanged.
- Cancel or dismiss during add: no partial or ghost entries.
- Very long titles or identifiers: behavior is defined (truncate display, scroll, or enforce reasonable length limits) so the UI stays usable—exact limit is an implementation detail; user always sees validation before save if over limit.
- No saved models yet: dropdown is empty; add flow remains reachable.
- Storage unavailable or corrupted: user sees a clear error or empty safe state without crashing the chat experience (assumption: standard app-level error handling).
- No models remain selectable after removals: product shows an explicit empty or blocked state for sending until a model exists (exact copy is implementation detail).
- Concurrent updates to the saved list on one device: last successful persist wins; multi-device sync is out of scope (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The chat experience MUST expose a way to view and select from the set of available models (user-saved entries on this device).
- **FR-002**: Users MUST be able to start an “add model” flow from the selection experience when they want to register a new identifier.
- **FR-003**: The add flow MUST collect a stable model identifier and a human-readable display title before saving.
- **FR-004**: The system MUST validate that both identifier and title are non-empty before persisting a new entry.
- **FR-005**: The system MUST reject a new saved entry when its identifier duplicates another saved entry after normalization. Normalization: trim surrounding whitespace; comparisons are case-insensitive.
- **FR-006**: User-saved model entries MUST persist across application restarts on the same device until removed.
- **FR-007**: When the chat experience loads, saved entries MUST be loaded so they appear in the selectable set without requiring a manual refresh.
- **FR-008**: Users MUST be able to remove a saved custom model via an explicit delete control associated with that entry or via a dedicated management view listing saved models.
- **FR-009**: After add or remove, the selectable list MUST update immediately to reflect the current set of saved entries.
- **FR-010**: If the currently active model is removed, the system MUST set the active model to the first model in the order defined in FR-012. If no models remain in the selectable set, the product MUST surface an explicit state consistent with Edge Cases.
- **FR-011**: The product MAY show brief non-blocking confirmation when an entry is added or removed; if not used, the updated list itself MUST make the outcome obvious.
- **FR-012**: The selectable list MUST show user-saved models sorted alphabetically by display title using case-insensitive ordering.

### Key Entities *(include if feature involves data)*

- **Model entry (saved)**: A user-defined record with a unique identifier string (unique among saved entries after normalization), a display title for lists, and a required provider label for display and grouping.
- **Selectable model set**: All user-saved entries presented in the chat UI for the current device, ordered per FR-012.

## Assumptions

- Persistence is **device-local** only; syncing custom models across devices or accounts is out of scope unless added in a later specification.
- Duplicate detection uses the normalization rules in FR-005.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A typical user can add a new custom model (open flow, enter both fields, save, see it listed) in under two minutes on first attempt without documentation.
- **SC-002**: After saving at least one custom model, closing the application completely, and reopening it, 100% of saved custom models reappear in the selectable list in a smoke test sample.
- **SC-003**: In structured testing, 100% of attempts to save a duplicate identifier (among saved entries, per FR-005) are rejected with no duplicate row created.
- **SC-004**: After removing the active custom model, 100% of test runs end with a valid active model (fallback or default) and no blocked chat state whenever at least one model remains selectable.
- **SC-005**: At least 90% of participants in informal usability checks report that they understand which model is active after selection or change (qualitative, observable in a short task script).
