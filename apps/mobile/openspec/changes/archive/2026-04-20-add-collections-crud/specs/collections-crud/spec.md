## ADDED Requirements

### Requirement: Collections list screen displays all collections
The app SHALL display a scrollable list of all collections, showing each collection's name.

#### Scenario: List renders all collections from database
- **WHEN** the user opens the Collections screen
- **THEN** all collections from the database are shown as a list, each displaying its name

#### Scenario: Empty state when no collections exist
- **WHEN** the database contains no collections
- **THEN** the Collections screen displays an empty state message prompting the user to create their first collection

### Requirement: User can create a new collection
The app SHALL allow the user to create a new collection by providing a name.

#### Scenario: Tapping the create button opens a name prompt
- **WHEN** the user taps the create (+) button on the Collections screen
- **THEN** a prompt or modal appears asking for the collection name

#### Scenario: Submitting a valid name creates the collection
- **WHEN** the user enters a non-empty name and confirms
- **THEN** the new collection is saved to the database and appears in the collections list

#### Scenario: Empty name is rejected
- **WHEN** the user submits an empty or whitespace-only name
- **THEN** the collection is not created and an error is shown

#### Scenario: Duplicate name is rejected
- **WHEN** the user submits a name that already exists (case-insensitive)
- **THEN** the collection is not created and the user is informed the name is already taken

### Requirement: User can rename an existing collection
The app SHALL allow the user to rename any collection.

#### Scenario: Rename action opens a pre-filled name prompt
- **WHEN** the user triggers the rename action on a collection (e.g., via a context menu)
- **THEN** a prompt or modal appears pre-filled with the current collection name

#### Scenario: Submitting a changed name updates the collection
- **WHEN** the user enters a new valid name and confirms
- **THEN** the collection name is updated in the database and reflected immediately in the list

#### Scenario: Submitting an empty name is rejected
- **WHEN** the user clears the name and confirms
- **THEN** the collection is not renamed and an error is shown

### Requirement: User can delete a collection
The app SHALL allow the user to delete a collection, with a confirmation step.

#### Scenario: Delete action shows a confirmation prompt
- **WHEN** the user triggers the delete action on a collection
- **THEN** a confirmation dialog appears warning that the collection will be permanently deleted

#### Scenario: Confirming deletion removes the collection
- **WHEN** the user confirms the deletion
- **THEN** the collection is removed from the database and disappears from the list

#### Scenario: Cancelling deletion leaves the collection intact
- **WHEN** the user dismisses the confirmation dialog without confirming
- **THEN** the collection remains unchanged

### Requirement: Collections list reflects real-time store state
The app SHALL keep the collections list in sync with the in-memory store; all mutations (create, rename, delete) update the store immediately.

#### Scenario: Created collection appears without reload
- **WHEN** the user creates a collection
- **THEN** it appears in the list immediately without requiring a screen reload

#### Scenario: Deleted collection disappears without reload
- **WHEN** the user deletes a collection
- **THEN** it disappears from the list immediately without requiring a screen reload

#### Scenario: Renamed collection updates without reload
- **WHEN** the user renames a collection
- **THEN** the new name appears in the list immediately without requiring a screen reload
