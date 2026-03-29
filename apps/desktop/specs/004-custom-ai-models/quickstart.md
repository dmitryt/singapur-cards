# Quickstart: Verify custom chat models (004)

Prerequisites: dev build running (`npm run dev` / Tauri), OpenRouter API key optional for send; model list works without send.

## SC-001 — Add under two minutes

1. Open **Chat**.
2. Open model dropdown; choose **Add new** (or equivalent).
3. Enter a **new** model id (e.g. `test/model-id`), a **title**, and a **provider** (e.g. `OpenRouter`); Save.
4. Confirm the new model appears in the list and can be selected.

## SC-002 — Persistence across restart

1. Add a custom model as above.
2. Fully quit the application and start again.
3. Open Chat; confirm the custom model still appears and is selectable.

## SC-003 — Duplicate rejection

1. Attempt to add a second entry with the **same** id as an existing custom (try different casing/spaces).
2. Confirm save is **blocked** and no duplicate row appears.

## SC-004 — Fallback after removing active

1. Select a **custom** model as active.
2. Open **Manage models**, delete that entry.
3. Confirm chat is not broken: another model is selected (default fallback or first in list per plan).

## SC-005 — Active model clarity

1. Select different models; confirm the dropdown shows the **human-readable** label for the current selection.

## Constitution spot-checks

- **Local data**: Clear app storage only via devtools if testing; app must not wipe custom models without user action.
- **Offline**: Disconnect network; model list and add/remove (local only) still work; send may fail as before.
