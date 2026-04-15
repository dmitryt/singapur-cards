# Feature Specification: Desktop Vocabulary Learning MVP

**Feature Branch**: `001-desktop-vocab-learning`
**Created**: 2026-03-20
**Status**: Draft
**Input**: User description: `@specify-description.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import and search dictionaries (Priority: P1)

A learner uses the desktop app as a local-first vocabulary tool: they import one or more DSL dictionaries from local files, assign each dictionary a source and target language, and search for words using a selected source language to quickly find definitions, translations, pronunciations, and examples. When the learner selects a word, the app opens a dedicated `HeadwordDetail` page that combines available translations for that word from uploaded dictionaries that match the selected source language.

**Why this priority**: Dictionary import and lookup are the foundation of the product. Without them, users cannot discover vocabulary or begin creating study material.

**Independent Test**: Can be fully tested by importing a valid DSL dictionary, searching for exact and prefix terms, and confirming that structured `HeadwordDetail` content appears on a dedicated detail page from local data without requiring internet access.

**Acceptance Scenarios**:

1. **Given** a user has a valid DSL dictionary file, **When** they import it into the app and provide the dictionary's source and target language, **Then** the dictionary is added to their local library with that language pair and becomes available for search.
2. **Given** a user imports a large dictionary file, **When** the import takes noticeable time, **Then** the app shows a visible upload or import progress indicator until processing completes or fails.
3. **Given** a user has imported dictionaries, **When** they select a source language and type a full word or prefix into search, **Then** only entries whose parent dictionary `language_from` equals the selected user language are considered and matching results appear quickly as they continue typing.
4. **Given** a matching headword exists, **When** the user opens that result, **Then** the app opens a dedicated `HeadwordDetail` page that shows the word and all available translations for it from uploaded dictionaries whose `language_from` matches the selected user language, including different translations contributed by different dictionaries, in a structured, readable format.

---

### User Story 2 - Save words as study cards (Priority: P2)

A learner opens a `HeadwordDetail` and saves it as a personal card, optionally adjusting the saved translation, example text, notes, or collection membership to fit their study goals.

**Why this priority**: Saving words as cards turns passive lookup into active learning value. It is the core bridge between dictionary usage and ongoing vocabulary practice.

**Independent Test**: Can be fully tested by selecting a search result, creating a card from the resulting `HeadwordDetail`, assigning the card to one or more collections, and confirming the saved card remains available after restarting the app.

**Acceptance Scenarios**:

1. **Given** a user is viewing a `HeadwordDetail`, **When** they choose to add it as a card, **Then** a new card is created with the available word details prefilled for review and editing, including the selected `language` and contributing `source_entry_ids`.
2. **Given** a user is creating or editing a card, **When** they save the card, **Then** the card is stored locally with its selected fields and any assigned collections.
3. **Given** a saved card should appear in multiple study groupings, **When** the user assigns it to more than one collection, **Then** the card appears in each selected collection without requiring duplicate card creation.

---

### User Story 3 - Review saved cards (Priority: P3)

A learner opens their saved cards, flips through them during a review session, and marks each card as learned or not learned to track progress over time.

**Why this priority**: Review mode delivers the MVP learning loop by helping users revisit and assess saved vocabulary after collection.

**Independent Test**: Can be fully tested by opening a saved collection of cards, flipping card fronts and backs, recording learned status, and confirming the updated status persists locally between sessions.

**Acceptance Scenarios**:

1. **Given** a user has saved cards, **When** they open review mode for all cards or a selected collection, **Then** they can move through cards one at a time in a clear front/back study view, with unreviewed cards presented first, then not-learned, then learned, randomized within each group.
2. **Given** a card is being reviewed, **When** the user flips the card, **Then** the reverse side reveals the saved answer content for self-checking.
3. **Given** a user finishes reviewing a card, **When** they mark it as learned or not learned, **Then** the app saves that status and shows it consistently in later browsing or review sessions.

---

### User Story 4 - Organize Cards into Collections (Priority: P2)

A learner organizes saved cards into named collections (e.g., "Business Vocabulary", "Chapter 3 Words") to study by topic or goal.

**Why this priority**: Collections make large card libraries manageable and enable focused study sessions.

**Independent Test**: Can be tested by creating a collection, assigning cards to it, and verifying the collection shows only assigned cards while unassigned cards remain in the library.

**Acceptance Scenarios**:

1. **Given** the user has cards in their library, **When** they create a new collection and assign cards to it, **Then** those cards appear in that collection.
2. **Given** a card exists, **When** the user assigns it to multiple collections, **Then** the card appears in all assigned collections without duplicating the underlying data.
3. **Given** a collection exists, **When** the user renames it, **Then** all cards in it remain unaffected.
4. **Given** a collection is deleted, **When** the user views the card library, **Then** all cards that were in that collection still exist in the general card library.

---

### Edge Cases

- What happens when a user imports a malformed, unsupported, or partially readable DSL file? → The system MUST import all valid entries and report the number of skipped or failed entries with a visible warning. A fully unreadable file MUST fail with a clear error message.
- How does the app communicate progress when a large dictionary import takes noticeable time?
- How does the app behave when search returns no matches across any imported dictionary?
- What happens when the user selects a source language for which no imported dictionaries exist?
- How does card creation behave when a dictionary entry is missing optional fields such as audio, transcription, or examples?
- What happens if a user tries to create the same card multiple times for the same `headword + language` pair? → The system MUST block creation and navigate the user to the existing card instead.
- How does review mode behave when a chosen collection has no cards? → The system MUST display a clear empty state on the review screen with a message indicating no cards are available and a call to action (e.g., a link to the Library or Collections page to add cards).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to import, name, and manage multiple DSL dictionaries from local files.
- **FR-001a**: The system MUST store `from` and `to` language metadata for each imported dictionary.
- **FR-001b**: The system MUST show a visible upload or import progress indicator when a dictionary import takes noticeable time, especially for large files.
- **FR-002**: The system MUST parse imported DSL dictionaries and make their entries searchable from local storage.
- **FR-003**: The system MUST support dictionary sizes up to 200,000 entries per dictionary without requiring the user to split files manually.
- **FR-004**: The system MUST let users search from a single search experience while filtering searchable entries so that only words whose parent dictionary `language_from` equals the selected user language can be selected or opened.
- **FR-005**: The system MUST support exact and prefix match behavior against headwords only so users can find likely matches even when a query is incomplete. Partial (substring) and fuzzy/approximate matching are deferred post-MVP. Searching inside definition or translation text is out of scope for the MVP.
- **FR-006**: The system MUST update search results as the user types, with results appearing within 300 ms of the user pausing typing (debounce threshold).
- **FR-007**: The system MUST open a dedicated `HeadwordDetail` page when a user selects a word from search results.
- **FR-007a**: The system MUST display all available translations and other available grouped word details for the selected headword in a structured format, combining uploaded dictionaries whose `language_from` matches the selected user language and including different translations contributed by different dictionaries together with the word itself plus any available transcription, meanings, examples, or pronunciation information.
- **FR-008**: Users MUST be able to create a card from a `HeadwordDetail`. If a card already exists for that `headword + language` pair, the system MUST block creation and navigate to the existing card instead.
- **FR-009**: The system MUST prefill a new card with the available word information from the selected `HeadwordDetail`, including `language` and contributing `source_entry_ids`.
- **FR-010**: Users MUST be able to edit a card's saved translation or definition, example text, notes, and pronunciation field before or after saving.
- **FR-011**: The system MUST allow users to organize cards into collections.
- **FR-012**: The system MUST allow a single card to belong to one or more collections at the same time.
- **FR-013**: Users MUST be able to browse saved cards outside of review mode. The library view displays card fronts (headword and collection labels) only; card flipping is exclusive to review mode.
- **FR-014**: The system MUST provide a basic review mode where users can view a card front, flip to the back, and move to the next card. Cards MUST be ordered with `unreviewed` cards first, then `not_learned`, then `learned`, randomized within each group.
- **FR-015**: The system MUST allow users to mark each reviewed card as learned or not learned.
- **FR-016**: The system MUST store imported dictionaries, saved cards, collections, and review status locally on the device.
- **FR-017**: The system MUST remain usable for all MVP flows without continuous network access.
- **FR-017a**: The system MUST NOT require a remote backend service or web API for dictionary import, search, card creation, collection management, or review in the MVP.
- **FR-018**: The system MUST preserve user data across application restarts unless the user explicitly deletes or replaces that data.
- **FR-019**: The system MUST provide clear feedback when an import fails, a search returns no results, or a save action cannot be completed. For partially readable DSL files, the system MUST import valid entries and display a warning showing the count of skipped entries; a fully unreadable file MUST produce a clear failure message.

### Key Entities *(include if feature involves data)*

- **Dictionary**: A user-imported reference source, including its display name, source and target language, source file metadata for display/troubleshooting, import status, and searchable entries persisted locally in SQLite after import.
- **Dictionary Entry**: One imported dictionary record for a word or phrase, including the headword and any available transcription, definitions, translations, example content, or pronunciation information.
- **Headword Detail**: A grouped read model shown when the user opens a search result. It combines all matching `Dictionary Entry` records for the selected headword within the selected user language.
- **Card**: A saved study item derived from a `Headword Detail`, including the word, `language`, answer content, example text, notes, optional pronunciation data, learning status, and optional `source_entry_ids` provenance metadata. The MVP permits at most one card per `headword + language` pair.
- **Collection**: A user-defined grouping of cards used for organization and review.
- **Review Record**: The current learned or not learned state associated with a card after review interactions.

### Assumptions

- The MVP is intended for a single local user profile on one desktop device at a time, no login, account system, or user separation is required.
- Imported dictionaries and learning data are managed locally only; no standalone backend API or cloud service is part of the MVP.
- Imported DSL files are read at import time and persisted as normalized content in SQLite; the MVP does not retain or copy the original DSL file after a successful import.
- Any future synchronization is outside the MVP scope and, if introduced later, is expected to focus on syncing with a mobile client rather than a general-purpose backend-dependent multi-platform service.
- Audio support is optional at the card level and may be absent for many entries without blocking card creation or review.
- Advanced spaced repetition, tagging, and complex filtering are future enhancements rather than MVP requirements.

## Clarifications

### Session 2026-03-24

- Q: What happens if a user tries to create the same card multiple times for the same `headword + language` pair? → A: Block creation and navigate to the existing card instead.
- Q: What is the maximum dictionary size the app must handle without performance degradation? → A: Up to 200,000 entries per dictionary.
- Q: In what order should cards be presented during a review session? → A: Unreviewed first, then not_learned, then learned — randomized within each group.
- Q: Does search match headwords only or also definition/translation text? → A: Headwords only; searching inside definitions is out of scope for the MVP.
- Q: What search match kinds are included in the MVP? → A: Exact and prefix only; substring and fuzzy matching are deferred post-MVP.
- Q: What should happen when a DSL file is malformed or only partially readable? → A: Import valid entries and report the count of skipped/failed entries with a warning; fully unreadable files fail with a clear error.
- Q: How should imported DSL files be handled after a successful import? → A: Read the selected file once, persist normalized content in SQLite, and keep only source metadata for display or troubleshooting.
- Q: How many cards can be created from a single imported dictionary entry? → A: At most one; duplicate save attempts are blocked and redirected to the existing card.
- Q: How should opening a search result behave in the MVP? → A: Navigate to a dedicated `HeadwordDetail` page rather than rendering the detail inline inside the search page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of dictionary searches return visible results or an explicit no-results state within 1 second after the user finishes typing a query against a dictionary of up to 200,000 entries on a typical consumer desktop.
- **SC-002**: Users can import a valid DSL dictionary and complete their first successful word lookup in under 5 minutes without external instructions.
- **SC-003**: 90% of attempted card saves from valid dictionary entries complete successfully on the first try during acceptance testing.
- **SC-004**: Users can complete a basic review session of 20 saved cards, including flipping and learned/not learned marking, without loss of progress after restarting the app.
- **SC-005**: All MVP user flows remain available when the device is offline, except for optional content that depends on externally provided media not stored locally.
