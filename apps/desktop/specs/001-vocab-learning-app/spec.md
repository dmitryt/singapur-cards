# Feature Specification: Vocabulary Learning Desktop Application

**Feature Branch**: `001-vocab-learning-app`
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: Full-featured vocabulary learning desktop app with DSL dictionary import, word search, card creation, collections, and flip-card review mode.

## User Scenarios & Testing

### User Story 1 - Import and Browse a Dictionary (Priority: P1)

A language learner imports a DSL dictionary file into the application to make its contents searchable. They want to verify the import succeeded and that entries are accessible.

**Why this priority**: Without imported dictionaries, none of the other features work. This is the entry point for all value in the application.

**Independent Test**: Can be tested by importing a DSL file, searching for a known word, and verifying the structured entry is displayed correctly.

**Acceptance Scenarios**:

1. **Given** the application is open, **When** the user selects a DSL file to import, **Then** the application accepts and processes it, displaying a progress indicator for large files.
2. **Given** a DSL file is being imported, **When** the file contains invalid or unsupported content, **Then** the application displays a clear error message and does not partially corrupt existing data.
3. **Given** a dictionary has been imported, **When** the user views the dictionary list, **Then** the dictionary appears with its name, entry count, and import date.
4. **Given** multiple dictionaries are imported, **When** the user removes one, **Then** it disappears from search results without affecting other dictionaries or any existing cards created from its entries.

---

### User Story 2 - Search for a Word (Priority: P1)

A learner looks up a word across all imported dictionaries. They type in a search box and instantly see matching entries with full dictionary information: word, transcription, meanings, and examples.

**Why this priority**: Word search is the primary daily interaction and directly enables card creation. It must feel fast and accurate for the app to be useful.

**Independent Test**: Can be tested with an imported dictionary by typing partial and full words and verifying results appear instantly with correct structured data.

**Acceptance Scenarios**:

1. **Given** at least one dictionary is imported, **When** the user types a word into the search box, **Then** matching results appear within 500 milliseconds even for dictionaries with 100,000+ entries.
2. **Given** the user is searching, **When** they type a partial word (e.g., "run" for "running"), **Then** the results include relevant partial and fuzzy matches.
3. **Given** multiple dictionaries are imported, **When** the user searches for a word, **Then** matches from all dictionaries are shown, each labeled with its source dictionary name.
4. **Given** a search result is selected, **When** the entry is displayed, **Then** it shows all available structured fields: word, transcription, definitions, and example sentences.
5. **Given** no matches are found, **When** the user searches, **Then** a clear "no results" message is shown.

---

### User Story 3 - Create a Card from a Dictionary Entry (Priority: P2)

A learner finds a word they want to remember and saves it as a card to their personal collection. They can review and add personal notes to supplement the dictionary content.

**Why this priority**: Card creation is the core learning data unit — it bridges dictionary lookup to active study.

**Independent Test**: Can be tested by importing a dictionary, finding a word, creating a card, and verifying the card appears in the card library with all correct fields.

**Acceptance Scenarios**:

1. **Given** a dictionary entry is displayed, **When** the user saves it as a card, **Then** a card is created with the word, definitions, and example sentences pre-filled from the dictionary entry.
2. **Given** the card creation screen is open, **When** the user adds personal notes, **Then** those notes are saved as part of the card.
3. **Given** a card already exists for a word, **When** the user tries to create another card for the same word from the same dictionary, **Then** they are notified and can choose to update the existing card or proceed with a new one.
4. **Given** a card is created, **When** the user views the card library, **Then** the new card is immediately visible.

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

### User Story 5 - Review Cards in Flip-Card Mode (Priority: P3)

A learner reviews saved cards using a flip-card interface to practice vocabulary recall. They mark each card as learned or not learned to track progress.

**Why this priority**: Review mode is the ultimate goal of the app but requires cards and collections to exist first.

**Independent Test**: Can be tested by creating several cards, starting a review session, flipping cards, marking their status, closing and reopening the app, and verifying status is preserved.

**Acceptance Scenarios**:

1. **Given** a collection or the full card library is selected for review, **When** the user starts a session, **Then** cards are presented one at a time showing the word side first.
2. **Given** a card is displayed, **When** the user flips it, **Then** the translation and definition side is revealed.
3. **Given** a card is showing its back side, **When** the user marks it "learned", **Then** the next card is shown and the status is saved.
4. **Given** a card is marked "not learned", **When** the session continues, **Then** the card may reappear later in the same session.
5. **Given** a review session ends, **When** the user sees the summary screen, **Then** it shows counts of learned vs. not-learned cards for that session.
6. **Given** the application is restarted, **When** the user views cards, **Then** learned/not-learned status from previous sessions is preserved.

---

### Edge Cases

- What happens when the user imports a DSL file that is malformed or only partially valid?
- How does the app handle a dictionary with duplicate headwords?
- What happens when a card is created from an entry with no example sentences — are those fields shown as empty or hidden?
- What happens when the user starts a review session on a collection with zero cards?
- What happens to existing cards if the source dictionary is removed — do they retain their content?

## Requirements

### Functional Requirements

- **FR-001**: The system MUST allow users to import dictionary files in DSL (Dictionary Specification Language) format.
- **FR-002**: The system MUST support importing and managing multiple dictionaries simultaneously.
- **FR-003**: The system MUST parse and index dictionary entries to enable fast search across all imported dictionaries.
- **FR-004**: The system MUST provide a real-time search experience where results appear as the user types, without requiring a submit action.
- **FR-005**: Search results MUST include fuzzy and partial matching to surface relevant entries with incomplete input.
- **FR-006**: The system MUST display structured dictionary entries including: word, transcription, definitions, and example sentences (where available in the source dictionary).
- **FR-007**: Users MUST be able to save any displayed dictionary entry as a card with a single action.
- **FR-008**: Each card MUST store: word, definition(s), example sentences, and user notes.
- **FR-009**: Cards MUST be stored as independent copies — removing a source dictionary MUST NOT delete or corrupt cards created from its entries.
- **FR-010**: Users MUST be able to create, rename, and delete named collections.
- **FR-011**: Users MUST be able to assign cards to one or more collections.
- **FR-012**: Deleting a collection MUST NOT delete the cards it contained; those cards remain in the card library.
- **FR-013**: Users MUST be able to start a flip-card review session from any collection or from the full card library.
- **FR-014**: During review, each card MUST be shown word-first; users MUST be able to flip it to reveal the definition side.
- **FR-015**: Users MUST be able to mark each card as "learned" or "not learned" during a review session.
- **FR-016**: Learned/not-learned status MUST persist across application restarts.
- **FR-017**: The application MUST function fully offline; no network connection required for any core feature.
- **FR-018**: All user data MUST be stored locally on the user's device.
- **FR-019**: The application MUST display a progress indicator during dictionary import operations.
- **FR-020**: The application MUST display a clear error message and preserve all existing data when an import fails.
- **FR-021**: The system MUST show a summary of learned vs. not-learned cards at the end of each review session.

### Key Entities

- **Dictionary**: A named imported dataset in DSL format. Attributes: name, source file name, import date, entry count.
- **Dictionary Entry**: A single record within a dictionary. Attributes: headword, transcription, definitions (list), example sentences (list), source dictionary reference.
- **Card**: A personal learning unit saved by the user. Independent from the source dictionary after creation. Attributes: word, definition(s), example sentences, user notes, creation date, learned status.
- **Collection**: A user-defined named group of cards. Attributes: name, creation date. Collections are containers — deleting them does not delete their cards.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Search results appear in under 500 milliseconds for dictionaries containing up to 500,000 entries.
- **SC-002**: A progress indicator is visible within 1 second of starting a dictionary import for files over 5MB.
- **SC-003**: Users can go from opening the app to having a card saved from a dictionary entry in under 2 minutes on first use.
- **SC-004**: 100% of user data (cards, collections, learned status) persists correctly across application restarts.
- **SC-005**: The application remains responsive during dictionary import — users can interact with existing cards and collections while an import runs in the background.
- **SC-006**: A review session can be started on any collection within 2 user interactions from the main screen.

## Assumptions

- The DSL format refers to the ABBYY Lingvo DSL dictionary format, the most common DSL standard for desktop dictionary apps. If another variant is intended, parsing specifics will differ but all other requirements remain valid.
- Audio pronunciation is NOT in scope for MVP — no recording, import, or playback of audio is required. The card data model may reserve a field for future audio support.
- The application is single-user; no login, account system, or user separation is required.
- Learned status is a simple binary toggle per card; no spaced repetition scheduling algorithm is required for MVP.
- Review card order within a session is random by default.
- The primary target platforms are macOS and Windows.

## Out of Scope (MVP)

- Synchronization between desktop and mobile clients
- Audio playback, TTS integration, or audio file import
- Tagging system for cards
- Advanced filtering and sorting beyond collection membership
- Spaced repetition scheduling
- Multi-user support or cloud accounts
