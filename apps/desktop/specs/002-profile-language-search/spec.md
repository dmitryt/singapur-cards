# Feature Specification: Language & Dictionary Management Pages & Search Bar Overhaul

**Branch**: `002-profile-language-search`
**Created**: 2026-03-26
**Status**: Draft

---

## Overview

This feature replaces the existing search page with dedicated Languages and Dictionaries pages for managing app configuration, and replaces the current search interface with a smarter, dropdown-based word lookup experience that is available across the entire application.

## Problem Statement

Users currently have no way to manage the languages available in the application. The existing search experience relies on a text input, which is imprecise and does not filter vocabulary by language. These gaps make it difficult for users to navigate multi-language dictionaries efficiently.

## Goals

- Give users dedicated pages to manage languages and dictionaries separately.
- Make vocabulary search faster and more accurate by replacing text input with structured dropdowns.
- Ensure the search bar is consistently available across all content pages without requiring per-page implementation.

## Non-Goals

- This feature does not change how dictionary entries (definitions, examples) are stored or displayed.
- This feature does not introduce user accounts or multi-user support.
- This feature does not change the navigation structure beyond removing the Search page and adding dedicated Languages and Dictionaries pages.

---

## Key Entities

### Language

| Field | Description                                                        |
|-------|--------------------------------------------------------------------|
| code  | Unique ISO 639-1 identifier: exactly 2 lowercase letters (e.g. "de", "fr"). Must be unique. |
| title | Human-readable display name (e.g. "German", "French")              |

### Headword

An existing entity representing a vocabulary word in the dictionary. Headwords belong to a language.

---

## Functional Requirements

### FR-1: Language List Display

The Languages Page must display all languages currently stored in the system as a list. Each entry shows the language's display name. The list always contains at least one language (a predefined default is seeded on first run).

**Acceptance criteria:**
- All stored languages are visible on the Languages Page.
- At least one language (the predefined default) is always present; the empty state is never shown.

### FR-2: Add Language

The user can add a new language by providing a unique identifier code and a display name. The system prevents duplicate identifier codes and enforces ISO 639-1 format for the code.

**Acceptance criteria:**
- A form or modal allows input of both fields.
- The code field accepts exactly 2 lowercase letters; any other input shows a validation error.
- Submitting with a duplicate code shows an error and does not create a duplicate.
- After a successful add, the new language appears in the list immediately.

### FR-3: Edit Language

The user can update the display name of an existing language. The identifier code is not editable after creation.

**Acceptance criteria:**
- An edit action is available for each language in the list.
- Changes are reflected immediately in the list after saving.
- Cancelling the edit leaves data unchanged.

### FR-4: Remove Language

The user can remove a language from the system. The system prompts for confirmation before deletion. At least one language must always remain — the last remaining language cannot be removed.

**Acceptance criteria:**
- A remove action is available for each language, except when only one language remains.
- A confirmation step prevents accidental deletion.
- After confirmation, the language is removed from the list.
- If only one language exists, the remove action is disabled or hidden, preventing an empty language list.
- Headwords previously associated with the deleted language are not removed; they remain in the system without a language association.

### FR-5: Persistent Language Storage

All language changes (add, edit, remove) are persisted so they survive application restarts.

**Acceptance criteria:**
- After closing and reopening the application, previously saved languages are still present.
- Removed languages do not reappear after restart.

### FR-6: Search Bar on All Content Pages

A search bar is displayed at the top of every content page (Library, Collections, Review, Headword Detail). Users do not need to navigate to a dedicated search page to look up words.

**Acceptance criteria:**
- The search bar is visible on all content pages (Library, Collections, Review, Headword Detail).
- The Languages Page, Dictionaries Page, and Profile Page have no search bar.

### FR-10: Dedicated Dictionaries Page

Dictionary management (importing, listing, removing dictionaries) lives on its own page at `/dictionaries`.

**Acceptance criteria:**
- A "Dictionaries" entry is present in the sidebar navigation.
- Navigating to `/dictionaries` renders the `DictionaryManager` component.

### FR-11: Dedicated Languages Page

Language management (add, edit, remove) lives on its own page at `/languages`, separate from dictionary management.

**Acceptance criteria:**
- A "Languages" entry is present in the sidebar navigation.
- Navigating to `/languages` renders the language list and add form.
- Language management (CRUD) is separate from active-language selection.

### FR-12: Profile Page — Active Language Selection

A Profile Page at `/profile` lets the user set the active language used by the search bar across all content pages. It does not perform CRUD; it only selects which stored language is currently active.

**Acceptance criteria:**
- A "Profile" entry is present in the sidebar navigation, above "Languages".
- Navigating to `/profile` shows a single "Active Language" dropdown listing all stored languages.
- Selecting a language updates `selectedLanguage` in the store immediately.
- The first language is pre-selected on first load if no language is set.
- The Profile Page has no search bar (outside `PageWithSearchBar` layout).

### FR-7: Language Filter via Profile Page

The active language is selected on the Profile Page and persists in the store for the session. The search bar reads `selectedLanguage` from the store to scope its headword results; it does not contain a language dropdown of its own.

**Acceptance criteria:**
- The search bar is disabled when no language is selected in the store.
- Changing the active language on the Profile Page resets the headword search query.
- The headword dropdown always shows words filtered to the currently selected language.

### FR-8: Headword Selection Dropdown

The search bar contains a searchable dropdown of headwords sorted alphabetically. Selecting a headword always navigates the user to that word's detail view.

**Acceptance criteria:**
- The headword dropdown is searchable (user can type to filter options).
- Headwords are displayed in alphabetical order (A → Z).
- Selecting a headword navigates to the word's detail view.
- The dropdown updates when the language filter changes.

### FR-9: Removal of Deprecated Search Components

The existing search page and search result card component are removed. No orphaned UI elements or broken navigation links remain.

**Acceptance criteria:**
- Navigation no longer references the removed search page.
- No search result cards appear anywhere in the application.
- The application has no broken routes or dead-end navigation states.

---

## User Scenarios & Testing

### Scenario 1: User adds a new language

1. User navigates to the Languages Page.
2. User selects "Add Language".
3. User enters a code (`"de"`) and title (`"German"`).
4. User confirms.
5. "German" appears in the language list.
6. User restarts the application — "German" is still listed.

### Scenario 2: User edits a language title

1. User navigates to the Languages Page.
2. User selects "Edit" on an existing language.
3. User changes the title from "German" to "Deutsch".
4. User saves.
5. The list now shows "Deutsch".

### Scenario 3: User removes a language

1. User navigates to the Languages Page.
2. User selects "Remove" on a language.
3. A confirmation prompt appears.
4. User confirms removal.
5. The language disappears from the list.

### Scenario 4: User searches for a word by language

1. User navigates to Profile Page and selects "German" as the active language.
2. User navigates to a content page (e.g. Library).
3. User sees the search bar at the top, scoped to German.
4. User types a word in the headword dropdown.
5. User selects a headword.
6. The application displays that word's content.

### Scenario 5: User attempts to add duplicate language code

1. User navigates to the Languages Page.
2. User attempts to add a language with a code that already exists.
3. An error message is displayed.
4. No duplicate is created.

### Edge Cases

- Adding a language with a code that is not exactly 2 lowercase letters shows a validation error.
- Adding a language with an empty title shows a validation error.
- The remove action is disabled or hidden when only one language remains; the profile list never reaches an empty state.
- Navigating between pages does not reset the selected language filter in the search bar.
- Removing a language that has associated headwords is permitted; those headwords remain in the system unaffected.

---

## Success Criteria

1. Users can add, edit, and remove languages in under 30 seconds per operation.
2. The headword dropdown reflects the selected language filter within 1 second of language selection.
3. The search bar is present on 100% of content pages and absent from the Languages and Dictionaries pages.
4. Zero broken navigation paths exist after the search page is removed.
5. Language data survives application restarts with 100% fidelity.
6. Duplicate language codes are rejected 100% of the time with a clear error message.

---

## Assumptions

- The application has a single user (no multi-user or permission model needed).
- Language codes follow ISO 639-1 format: exactly 2 lowercase letters (e.g. "de", "fr") — uniqueness and format are enforced at input time.
- The application ships with one predefined language (e.g. English) seeded into the database on first run.
- At least one language must always exist in the system; the language list can never be emptied.
- Headwords are already stored in the system and associated with a language; this feature does not change how headwords are created or imported.
- The headword detail view or display behavior on selection already exists; this feature only changes how the user selects a headword.
- Selecting a headword from the dropdown navigates to the existing word detail view (same behavior as previous search result selection).
- The language filter selection in the search bar persists for the duration of the session but does not need to persist across restarts.

---

## Clarifications

### Session 2026-03-26

- Q: When a language is deleted, what happens to its headwords? → A: Headwords remain untouched (orphaned without a language association).
- Q: When a user selects a headword from the dropdown, what happens? → A: Always navigate to the word's detail view.
- Q: What does the headword dropdown show when no language is selected, and can the language list be empty? → A: One predefined language (e.g. English) is seeded by default; at least one language must always exist; the first language is preselected in the dropdown by default.
- Q: Should the language code field have a format constraint? → A: Strict ISO 639-1 — exactly 2 lowercase letters.
- Q: How should headwords be ordered in the dropdown? → A: Alphabetical order (A → Z).

---

## Dependencies

- Existing headword storage and display functionality must be in place.
- The application's navigation system must support adding and removing top-level pages.
- Language data must be accessible to the search bar component on all wrapped pages.
