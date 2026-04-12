## ADDED Requirements

### Requirement: Cards list screen displays all cards
The app SHALL display a scrollable list of all cards showing the headword, language badge, and learning status for each card.

#### Scenario: List renders cards from database
- **WHEN** the user opens the app
- **THEN** all cards from the database are displayed as a list, each showing headword, language, and learning status

#### Scenario: Empty state when no cards exist
- **WHEN** the database contains no cards
- **THEN** the list screen displays an empty state message

### Requirement: Cards list is filterable by collection
The app SHALL display a horizontally scrollable row of collection chips above the card list. Selecting a collection chip filters the list to show only cards in that collection.

#### Scenario: All collections are shown as chips
- **WHEN** the cards list screen loads
- **THEN** an "All" chip and one chip per collection are shown in a horizontal scrollable row

#### Scenario: Selecting a collection chip filters the list
- **WHEN** the user taps a collection chip
- **THEN** only cards belonging to that collection are shown in the list

#### Scenario: Selecting "All" shows every card
- **WHEN** the user taps the "All" chip after a collection was active
- **THEN** the full unfiltered card list is shown

#### Scenario: Active chip is visually distinguished
- **WHEN** a collection chip is selected
- **THEN** it appears visually distinct from unselected chips

### Requirement: Card list items are color-coded by learning status
The app SHALL apply a background color to each card list item based on its `learning_status`:
- `learned` → `#d4edda` (light green)
- `not_learned` → `#f8d7da` (light red)
- `unreviewed` → `#ffffff` (white)

#### Scenario: Learned card has green background
- **WHEN** a card has `learning_status = learned`
- **THEN** its list item background is `#d4edda`

#### Scenario: Not-learned card has red background
- **WHEN** a card has `learning_status = not_learned`
- **THEN** its list item background is `#f8d7da`

#### Scenario: Unreviewed card has white background
- **WHEN** a card has `learning_status = unreviewed`
- **THEN** its list item background is `#ffffff`

### Requirement: Tapping a card navigates to card detail
The app SHALL navigate to the card detail screen when the user taps a card list item.

#### Scenario: Tap navigates to detail
- **WHEN** the user taps a card in the list
- **THEN** the app navigates to `/cards/[id]` for that card

### Requirement: List screen has a start review action
The app SHALL display a "Start Review" button that begins a review session for the currently visible cards (filtered or all).

#### Scenario: Start Review button navigates to review
- **WHEN** the user taps "Start Review"
- **THEN** the app navigates to the review session screen, scoped to the currently active collection filter (or all cards if no filter)

#### Scenario: Start Review is disabled with empty list
- **WHEN** the currently filtered card list is empty
- **THEN** the "Start Review" button is disabled or hidden
