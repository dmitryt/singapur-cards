## ADDED Requirements

### Requirement: Card detail screen shows full card content
The app SHALL display a dedicated screen for a single card showing: headword, language, answer text, example text (if present), notes (if present), and current learning status.

#### Scenario: All fields rendered
- **WHEN** the user navigates to `/cards/[id]`
- **THEN** the headword, language badge, answer text, and learning status are visible; example and notes are shown only if non-empty

#### Scenario: Unknown card ID shows error state
- **WHEN** the user navigates to `/cards/[id]` with a non-existent ID
- **THEN** an error or "not found" message is displayed

### Requirement: Card detail screen is color-coded by learning status
The app SHALL apply a background color to the card detail screen based on its `learning_status`:
- `learned` → `#d4edda` (light green)
- `not_learned` → `#f8d7da` (light red)
- `unreviewed` → `#ffffff` (white)

#### Scenario: Detail screen reflects status color
- **WHEN** the user views a card with a given `learning_status`
- **THEN** the card background color matches the status color defined above

### Requirement: Card detail screen has a back navigation action
The app SHALL provide a way for the user to return to the cards list from the detail screen.

#### Scenario: Back navigation returns to list
- **WHEN** the user taps the back button on the card detail screen
- **THEN** the app navigates back to the cards list
