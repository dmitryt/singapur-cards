## ADDED Requirements

### Requirement: Hamburger navigation menu is accessible on top-level screens
The app SHALL display a hamburger (menu) button in the header of each top-level screen (Cards list and Collections list) that opens a slide-in navigation drawer.

#### Scenario: Hamburger button is visible on the Cards list screen
- **WHEN** the user is on the Cards list screen
- **THEN** a hamburger menu button is visible in the header

#### Scenario: Hamburger button is visible on the Collections list screen
- **WHEN** the user is on the Collections list screen
- **THEN** a hamburger menu button is visible in the header

### Requirement: Navigation menu is hidden on sub-screens
The app SHALL not render the navigation menu on sub-screens (card detail, review session, settings, or any other non-top-level screen).

#### Scenario: Navigation menu is not present on the card detail screen
- **WHEN** the user navigates to a card's detail screen
- **THEN** no hamburger button or navigation drawer is present

#### Scenario: Navigation menu is not present during a review session
- **WHEN** the user navigates to the review screen
- **THEN** no hamburger button or navigation drawer is present

### Requirement: Navigation drawer allows switching between top-level sections
The app SHALL provide tappable items in the drawer for navigating between the Cards section and the Collections section.

#### Scenario: Tapping the Cards item navigates to the Cards list
- **WHEN** the user opens the drawer and taps the Cards item
- **THEN** the drawer closes and the app navigates to the Cards list screen

#### Scenario: Tapping the Collections item navigates to the Collections list
- **WHEN** the user opens the drawer and taps the Collections item
- **THEN** the drawer closes and the app navigates to the Collections list screen

### Requirement: Navigation drawer includes a Settings entry
The app SHALL provide a Settings item in the navigation drawer that navigates to the Settings screen.

#### Scenario: Tapping the Settings item navigates to the Settings screen
- **WHEN** the user opens the drawer and taps the Settings item
- **THEN** the drawer closes and the app navigates to the Settings screen

#### Scenario: Settings item is active when on the Settings screen
- **WHEN** the user opens the drawer while on the Settings screen
- **THEN** the Settings item appears highlighted

### Requirement: Active section is visually distinguished in the drawer
The app SHALL visually distinguish the item corresponding to the currently active top-level section.

#### Scenario: Cards item is active when on the Cards list
- **WHEN** the user opens the drawer while on the Cards list screen
- **THEN** the Cards item appears highlighted and the Collections item appears inactive

#### Scenario: Collections item is active when on the Collections list
- **WHEN** the user opens the drawer while on the Collections list screen
- **THEN** the Collections item appears highlighted and the Cards item appears inactive
