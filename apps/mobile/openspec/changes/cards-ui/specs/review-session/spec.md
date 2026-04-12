## ADDED Requirements

### Requirement: Review session presents cards in defined order
The app SHALL present cards during a review session in the following order: `unreviewed` first, then `not_learned`, then `learned`. The session is scoped to a collection if one was selected, otherwise all cards are included.

#### Scenario: Deck order follows status priority
- **WHEN** the user starts a review session with cards of mixed statuses
- **THEN** unreviewed cards appear before not_learned cards, which appear before learned cards

#### Scenario: Collection-scoped review shows only collection cards
- **WHEN** the user starts a review session with a collection filter active
- **THEN** only cards belonging to that collection are included in the session deck

#### Scenario: Empty deck shows end state immediately
- **WHEN** the review session is started but no cards are available
- **THEN** the session shows a "no cards to review" message

### Requirement: Card flips on tap to reveal or hide answer
Each card in a review session SHALL start showing only the headword (front face). Tapping anywhere on the card toggles between front and back face. There are no explicit "Show Answer" or navigation buttons on the card itself.

#### Scenario: Front face shows headword only
- **WHEN** a card is presented in the review session
- **THEN** only the headword (and language badge) is visible; answer is hidden

#### Scenario: Tap on front face flips card to reveal answer
- **WHEN** the user taps anywhere on the card (front face)
- **THEN** the card flips to show the answer text and example text

#### Scenario: Tap on back face flips card back to front
- **WHEN** the card is showing the back face (answer visible)
- **AND** the user taps anywhere on the card
- **THEN** the card flips back to the front face, hiding the answer

#### Scenario: Swipe hint is shown on back face
- **WHEN** the card is showing the back face
- **THEN** a hint label "← Not Learned · Learned →" is displayed below the card

### Requirement: User records a result by swiping the card
After flipping a card to see the answer, the user SHALL record a result by swiping the card. Swiping right records `learned`; swiping left records `not_learned`. Recording a result SHALL persist a `review_events` row and update `cards.learning_status` and `cards.last_reviewed_at` atomically.

#### Scenario: Swipe right records learned
- **WHEN** the card is showing the back face
- **AND** the user swipes the card to the right past the threshold (30% of screen width)
- **THEN** a review event with result `learned` is inserted, the card's `learning_status` is set to `learned`, and the next card is shown

#### Scenario: Swipe left records not learned
- **WHEN** the card is showing the back face
- **AND** the user swipes the card to the left past the threshold (30% of screen width)
- **THEN** a review event with result `not_learned` is inserted, the card's `learning_status` is set to `not_learned`, and the next card is shown

#### Scenario: Swipe below threshold snaps card back
- **WHEN** the user swipes the card but releases before reaching the threshold
- **THEN** the card snaps back to its original position and no result is recorded

#### Scenario: Card tilts and shows colored overlay during swipe
- **WHEN** the user is actively dragging the card on the back face
- **THEN** the card tilts in the direction of the drag and shows a green (right) or red (left) overlay that intensifies with drag distance

#### Scenario: Swiping is disabled while a result is being recorded
- **WHEN** the app is persisting a result (recording in progress)
- **THEN** swipe gestures are disabled until the next card is shown

#### Scenario: Both writes succeed or neither persists
- **WHEN** the review event insert and card status update are executed
- **THEN** both succeed together or both fail together (atomic transaction)

### Requirement: Review card background reflects current learning status
After a result is recorded, the card SHALL update its background color to reflect the newly assigned `learning_status` before advancing to the next card:
- `learned` → `#d4edda` (light green)
- `not_learned` → `#f8d7da` (light red)
- `unreviewed` → `#ffffff` (white)

#### Scenario: Card turns green after swiping right
- **WHEN** the user swipes right to mark learned
- **THEN** the card background changes to `#d4edda` before advancing to the next card

#### Scenario: Card turns red after swiping left
- **WHEN** the user swipes left to mark not learned
- **THEN** the card background changes to `#f8d7da` before advancing to the next card

### Requirement: User can exit the review session at any time
The review screen SHALL provide a way to navigate back to the cards list without completing the session.

#### Scenario: Back button is visible during review
- **WHEN** the review session is in progress
- **THEN** a "← Cards" button is visible in the header

#### Scenario: Tapping back navigates to cards list
- **WHEN** the user taps "← Cards" during a review session
- **THEN** the user is taken back to the cards list and the session is abandoned

### Requirement: Review session ends after all cards are reviewed
The app SHALL display a completion screen after all cards in the session have been reviewed.

#### Scenario: Completion screen shown after last card
- **WHEN** the user records a result for the last card in the deck
- **THEN** a completion screen is shown with a summary (e.g., number of cards reviewed)

#### Scenario: Completion screen allows returning to list
- **WHEN** the completion screen is shown
- **THEN** the user can navigate back to the cards list
