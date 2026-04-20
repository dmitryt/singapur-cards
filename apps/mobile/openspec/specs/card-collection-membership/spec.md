## ADDED Requirements

### Requirement: Card detail screen shows which collections the card belongs to
The app SHALL display a "Collections" section on the card detail screen listing all available collections, with a visual indicator on each collection the card currently belongs to.

#### Scenario: Collections section lists all collections
- **WHEN** the user opens a card detail screen and at least one collection exists
- **THEN** all collections are listed in the Collections section

#### Scenario: Memberships are visually indicated
- **WHEN** a card belongs to one or more collections
- **THEN** each collection the card belongs to is marked with a checkmark or equivalent indicator

#### Scenario: Collections section is empty-stated when no collections exist
- **WHEN** no collections exist in the database
- **THEN** the Collections section shows a message indicating there are no collections yet

### Requirement: User can add a card to a collection from the card detail screen
The app SHALL allow the user to add the current card to any collection by tapping that collection in the Collections section.

#### Scenario: Tapping an unchecked collection adds the card
- **WHEN** the user taps a collection that the card does not belong to
- **THEN** the card is added to that collection and the collection row shows the membership indicator immediately

#### Scenario: Membership persists after navigating away
- **WHEN** the user adds a card to a collection and navigates back to the card list
- **THEN** the card is included when filtering by that collection

### Requirement: User can remove a card from a collection from the card detail screen
The app SHALL allow the user to remove the current card from a collection by tapping a checked collection.

#### Scenario: Tapping a checked collection removes the card
- **WHEN** the user taps a collection that the card already belongs to
- **THEN** the card is removed from that collection and the membership indicator disappears immediately

#### Scenario: Removal persists after navigating away
- **WHEN** the user removes a card from a collection and navigates back to the card list
- **THEN** the card is no longer shown when filtering by that collection
