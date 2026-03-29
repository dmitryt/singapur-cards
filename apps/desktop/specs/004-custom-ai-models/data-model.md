# Data model: Custom chat models

## Saved model record

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `name` | string | yes | OpenRouter-style model id; persisted as trimmed; uniqueness by normalized form |
| `title` | string | yes | Display label in lists; trimmed non-empty |
| `provider` | string | yes | Provider/grouping label; required for display and future filtering |

**Invariants**

- Normalized `name` must be unique among all saved rows.
- Max length: enforce reasonable cap at UI validation (e.g. 256 / 128) before save to satisfy “very long” edge case; exact numbers are implementation.

## Selectable model set (runtime)

Ordered list for dropdown: all saved models, sorted by `title` with `localeCompare(undefined, { sensitivity: “base” })`. Empty by default.

Each option row: `value` = `name` string; `text` = `title` for display.

## Session state (React)

| State | Type | Responsibility |
|-------|------|----------------|
| `customModels` | `SavedModel[]` | Loaded from storage on ChatPage mount; updated on add/remove |
| `selectedModel` | `string \| null` | Current OpenRouter id; if removed, apply fallback per FR-010 |

## State transitions

- **Load app**: `invoke('list_custom_models')` → set `customModels`. On error: treat as `[]`, optional user message once.
- **Add**: Modal save → normalize → reject if duplicate → `invoke('add_custom_model', { name, title, provider })` → update state.
- **Remove**: Manage modal → `invoke('delete_custom_model', { name })` → if `selectedModel` was removed, set fallback id.
- **Command error**: Catch `invoke` rejection; show non-blocking message; keep in-memory state intact.
