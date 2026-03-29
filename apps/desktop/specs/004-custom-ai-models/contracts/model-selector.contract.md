# UI contract: Model selector (Chat + Models page)

## Test IDs (stable)

All IDs below are pinned. Do not rename without updating tests.

| Element | `data-testid` |
|---------|----------------|
| Model dropdown trigger (Chat) | `model-selector` |
| Composer send | `composer-send` |
| Models page root | `models-page` |
| Provider selector | `models-provider-selector` |
| Add model form | `add-model-form` |
| Save new model button | `custom-model-save` |
| Delete custom row button | `custom-model-delete` (include index or id in tests via `getAllByTestId`) |

## Behaviors

1. **Options order**: User-saved models sorted alphabetically by display title (case-insensitive).
2. **Selection**: `value` is the model id string; empty string means none where the Dropdown requires a value.
3. **Add flow**: User navigates to Models page → selects provider from `SUPPORTED_PROVIDERS` → enters `name` and `title` → Save validates (both non-empty, no duplicate) → storage updated → model list refreshes.
4. **Delete flow**: User opens Models page → provider filter shows entries for selected provider → Delete removes from storage and refreshes list; if removed item was active selection in Chat, apply fallback per FR-012 (first model in FR-013 order, or explicit empty state if none remain).

## Accessibility (minimal)

- Form fields have associated `<label>` or `aria-label`.
- Delete actions are keyboard reachable.
