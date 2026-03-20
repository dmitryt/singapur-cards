# Data Model: Desktop Vocabulary Learning MVP

## Overview

The MVP data model centers on imported dictionaries, the entries extracted from them, and the learner-owned study objects built on top of those entries. SQLite is the canonical store for all entities below.

## Entities

### Dictionary

**Purpose**: Represents a user-imported DSL dictionary managed by the app.

**Fields**:
- `id`: Stable internal identifier
- `name`: User-visible dictionary name
- `language_from`: Language users search in for this dictionary
- `language_to`: Language the dictionary translates or explains into
- `source_filename`: Original file name for display and troubleshooting
- `source_path`: App-owned persisted location or original file reference when retained
- `import_status`: `queued | importing | ready | failed`
- `entry_count`: Count of successfully indexed entries
- `last_error`: Most recent import failure message, if any
- `created_at`: Timestamp when the dictionary record was created
- `updated_at`: Timestamp when the dictionary metadata last changed

**Validation rules**:
- `name` is required
- `name` must be unique among active dictionaries
- `language_from` is required
- `language_to` is required
- `import_status` must be one of the allowed lifecycle states
- `entry_count` cannot be negative

**Relationships**:
- One `Dictionary` has many `DictionaryEntry` records

**State transitions**:
- `queued -> importing`
- `importing -> ready`
- `importing -> failed`
- `failed -> importing` for explicit retry

### DictionaryEntry

**Purpose**: Represents a searchable dictionary record extracted from DSL content. Entry detail views can aggregate multiple `DictionaryEntry` records for the same word across uploaded dictionaries when their parent dictionaries share the selected `language_from`.

**Fields**:
- `id`: Stable internal identifier
- `dictionary_id`: Parent dictionary reference
- `headword`: Display word or phrase
- `normalized_headword`: Normalized search key for indexing
- `transcription`: Optional pronunciation/transcription text
- `definition_text`: Structured meaning content rendered into a displayable format
- `example_text`: Optional example content
- `audio_reference`: Optional pronunciation reference
- `source_order`: Original order within the imported dictionary
- `created_at`: Timestamp when the entry was indexed

**Validation rules**:
- `dictionary_id` is required
- `headword` is required
- `normalized_headword` is required
- `source_order` cannot be negative

**Relationships**:
- Many `DictionaryEntry` records belong to one `Dictionary`
- One `DictionaryEntry` can seed many `Card` records

### Card

**Purpose**: Represents the learner's saved study unit.

**Fields**:
- `id`: Stable internal identifier
- `source_entry_id`: Optional reference to the originating dictionary entry
- `headword`: Saved prompt text shown on the card front
- `answer_text`: Translation and/or definition shown on the back
- `example_text`: Optional learner-visible example content
- `notes`: Optional learner notes
- `audio_reference`: Optional pronunciation reference
- `learning_status`: `unreviewed | learned | not_learned`
- `created_at`: Timestamp when the card was created
- `updated_at`: Timestamp when the card was last edited
- `last_reviewed_at`: Optional timestamp of the most recent review action

**Validation rules**:
- `headword` is required
- `answer_text` is required
- `learning_status` must be one of the allowed values
- Empty optional fields should be stored as null or empty consistently

**Relationships**:
- Many `Card` records can originate from one `DictionaryEntry`
- Many `Card` records can belong to many `Collection` records through `CollectionMembership`
- One `Card` can have many `ReviewEvent` records

**State transitions**:
- `unreviewed -> learned`
- `unreviewed -> not_learned`
- `not_learned -> learned`
- `learned -> not_learned`

### Collection

**Purpose**: Represents a user-defined grouping of cards for browsing or review.

**Fields**:
- `id`: Stable internal identifier
- `name`: User-visible collection name
- `description`: Optional collection description
- `created_at`: Timestamp when the collection was created
- `updated_at`: Timestamp when the collection was last changed

**Validation rules**:
- `name` is required
- `name` must be unique among collections

**Relationships**:
- Many `Collection` records contain many `Card` records through `CollectionMembership`

### CollectionMembership

**Purpose**: Join entity linking cards to one or more collections.

**Fields**:
- `collection_id`: Parent collection reference
- `card_id`: Linked card reference
- `created_at`: Timestamp when the membership was added

**Validation rules**:
- `collection_id` is required
- `card_id` is required
- The pair `collection_id + card_id` must be unique

**Relationships**:
- Belongs to one `Collection`
- Belongs to one `Card`

### ReviewEvent

**Purpose**: Captures each explicit review outcome so the app can preserve current state and support future progress features.

**Fields**:
- `id`: Stable internal identifier
- `card_id`: Reviewed card reference
- `result`: `learned | not_learned`
- `reviewed_at`: Timestamp of the review action

**Validation rules**:
- `card_id` is required
- `result` must be one of the allowed values

**Relationships**:
- Many `ReviewEvent` records belong to one `Card`

## Relationship Summary

- `Dictionary 1 -> N DictionaryEntry`
- `DictionaryEntry 1 -> N Card`
- `Card N -> N Collection` via `CollectionMembership`
- `Card 1 -> N ReviewEvent`

## Persistence Notes

- The database is the single source of truth for dictionaries, cards, collections, and review state.
- Search indexes are derived from `DictionaryEntry` content and filtered by parent `Dictionary` language metadata so only entries whose dictionary `language_from` matches the selected user language are eligible in search and entry detail flows.
- Dictionary entry detail views aggregate translations for the selected word from uploaded dictionaries that match the selected user language.
- User-triggered deletion flows must remove related data predictably and only after explicit confirmation.
