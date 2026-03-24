# Quickstart: Desktop Vocabulary Learning MVP

## Purpose

This guide describes how to bootstrap the desktop app locally and verify the core MVP flows after implementation.

## Prerequisites

- Rust toolchain installed
- Node.js LTS installed
- Tauri v2 desktop prerequisites installed for the target operating system

## Initial Setup

1. From `apps/desktop`, install JavaScript dependencies.
2. Install Rust dependencies for the Tauri backend.
3. Configure the Tauri SQL plugin with SQLite support and minimum required capabilities.
4. Start the development app shell and confirm the desktop window opens successfully.

## Suggested Project Bootstrap

1. Initialize the React + TypeScript frontend in `src/`.
2. Initialize the Tauri v2 backend in `src-tauri/`.
3. Add SQLite migrations and create the initial local schema.
4. Create feature folders for dictionaries, search, cards, collections, and review.
5. Add baseline tests for parser, migrations, and primary UI flows before feature expansion.

## Automated Verification

Run these checks from `apps/desktop` after implementation work:

```bash
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

If a separate lint or typecheck script is added, run it as part of the default local verification path.

## Manual Smoke Test

1. Launch the desktop app in development mode.
2. Import a valid DSL dictionary from a local file and provide its source and target language.
3. Confirm the dictionary appears in the managed dictionary list with the expected language pair, a ready state, and a non-zero entry count.
4. Select the imported source language and search for an exact word, a partial match, and a misspelled variant; confirm results update quickly and the app remains responsive.
5. Open a result and verify structured entry details render correctly.
6. Create a card from the entry, edit at least one field, and save it.
7. Create a collection, assign the card to it, and verify the card appears when filtering by that collection.
8. Start review mode, flip the card, mark it as learned or not learned, and confirm the state is reflected in card browsing.
9. Close and reopen the app; confirm dictionaries, cards, collections, and review status persist.
10. Disable network access and repeat a search plus a review action to verify offline behavior.

## Data Safety Checks

1. Attempt to import an invalid DSL file and confirm the app shows a clear failure message without corrupting existing data.
2. Attempt to search with a source language that has no imported dictionaries and confirm the app shows a clear empty state.
3. Remove a dictionary only through an explicit confirmation flow.
4. Confirm user-created cards and collections are not deleted unless the user explicitly chooses a destructive action.

## Implementation Notes

- Keep the canonical data model in SQLite, not in browser persistence.
- Use Zustand persistence only for lightweight UI preferences or in-progress session state.
- Avoid deep styling overrides on Semantic UI React components; prefer styled wrappers and layout composition.
