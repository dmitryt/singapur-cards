# UI contract: Model selector (Chat)

## Test IDs (stable)

All IDs below are pinned. Do not rename without updating tests.

| Element | `data-testid` |
|---------|----------------|
| Model dropdown trigger | `model-selector` |
| Composer send | `composer-send` |
| Add custom modal root | `custom-model-modal` |
| Manage models modal root | `manage-custom-models-modal` |
| Save new model button | `custom-model-save` |
| Delete custom row button | `custom-model-delete` (include index or id in tests via `getAllByTestId`) |

## Behaviors

1. **Options order**: Built-in models (catalog order) first; then custom models sorted by display title (case-insensitive).
2. **Selection**: `value` is the model id string; empty string means none where the Dropdown requires a value.
3. **Add flow**: User triggers addition → modal collects `name`, `title`, and `provider` (all required) → Save validates → storage updated → dropdown options refresh.
4. **Manage flow**: User opens manage modal → list shows only custom entries → Delete removes from storage and refreshes options; if removed item was selected, apply fallback per FR-010 (configured default if present, else first model in FR-012 order).

## Accessibility (minimal)

- Modal fields have associated `<label>` or `aria-label`.
- Delete actions are keyboard reachable.
