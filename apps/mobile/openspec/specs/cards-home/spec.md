### Requirement: Cards home shows search and advanced search entry
The cards home screen SHALL present a single horizontal toolbar row containing: a headword search field (with embedded clear control when text is non-empty) and an advanced-search affordance (filter icon). The toolbar SHALL NOT show the learning language chip; language is surfaced only inside the advanced search sheet.

#### Scenario: Search filters cards by headword prefix
- **WHEN** the user types text in the headword search field
- **THEN** the card list shows only cards whose `headword` begins with the query as a case-insensitive prefix

#### Scenario: Embedded clear clears search text
- **WHEN** the search field has non-empty text
- **THEN** an embedded clear affordance is visible and tapping it clears the query and restores the unfiltered list (within collection and language scope)

### Requirement: Advanced search scopes language and collection in a modal
The app SHALL expose advanced search as a **modal sheet** opened from the toolbar filter icon, without navigating away from the cards home. The sheet SHALL include, in order: a header with title and **Done**; a **Learning language** section with the same hint as Settings (“Cards and review use this language.”), a tappable **language chip** showing the active learning language code in uppercase, and a **Collection** section listing “All collections” and every row from the `collections` table (by name). The active collection filter SHALL be shared app state so the home list updates while the sheet is open. Dismissing the sheet SHALL be possible via **Done**, tapping the dimmed backdrop, or the platform back action. The filter icon on the home toolbar SHALL reflect when a specific collection is selected (distinct from the “all collections” state).

#### Scenario: Filter icon opens advanced search without changing routes
- **WHEN** the user taps the toolbar filter icon
- **THEN** an advanced search modal appears over the cards home and the underlying route remains the cards home

#### Scenario: Language chip reflects stored active language inside advanced search
- **WHEN** the advanced search sheet is visible and the app has an active learning language stored in `app_meta` (default `en` on first launch)
- **THEN** the language chip in the sheet displays that code in uppercase (e.g. `EN`)

#### Scenario: Language chip opens Settings from advanced search
- **WHEN** the user taps the language chip inside the advanced search sheet
- **THEN** the advanced search modal closes and the app navigates to the Settings route where the learning language can be changed

#### Scenario: Collection choice scopes the list
- **WHEN** the user selects a collection row in the advanced search modal (or “All collections”)
- **THEN** the card list shows only cards in that collection for the active learning language, or all cards in that language when “All collections” is active

#### Scenario: Dismiss advanced search
- **WHEN** the user taps Done, taps outside the sheet on the backdrop, or invokes the Android back gesture while the modal is visible
- **THEN** the advanced search modal closes and the cards home remains visible with the collection scope unchanged from the last selection

### Requirement: Active learning language is persisted and shared
The app SHALL persist the active learning language under `app_meta` with key `active_learning_language`, defaulting to `en` when missing. The value SHALL be hydrated after database migrations on startup. Cards loading and review deck loading SHALL filter by this language.

#### Scenario: Default language on first launch
- **WHEN** the app runs migrations and no `active_learning_language` row exists yet
- **THEN** the app inserts `active_learning_language` = `en` and uses `en` for list and review queries

#### Scenario: Review uses the same language as the home list
- **WHEN** the user starts review from the cards home
- **THEN** the review session includes only cards whose `language` equals the active learning language (and optional collection filter), with no separate language override from URL parameters

### Requirement: Settings screen configures learning language
The app SHALL expose a `settings` route where the user can change the active learning language from the list backed by the `languages` table.

#### Scenario: Settings lists languages and updates persistence
- **WHEN** the user opens Settings and selects a language row
- **THEN** `app_meta.active_learning_language` is updated and subsequent card loads and review loads use that code

#### Scenario: Navigation to Settings from advanced search language chip
- **WHEN** the user opens advanced search from the cards home and taps the language chip in the sheet
- **THEN** the Settings screen is shown and Back returns to the cards home

### Requirement: Cards home footer shows centered review entry
The cards home footer SHALL present a single primary action to start review, horizontally centered. There SHALL be no separate Settings link in the footer.

#### Scenario: Start Review is centered
- **WHEN** the cards home footer is visible
- **THEN** the “Start Review” control is centered in the footer area

### Requirement: Toolbar layout constraints on small screens
The headword search field SHALL use flexible width with a minimum width near 112 dp. The filter icon SHALL remain a compact fixed-width touch target so the row stays usable on narrow devices.

#### Scenario: Search field retains minimum width next to the filter icon
- **WHEN** the device width is small
- **THEN** the search field still receives at least the configured minimum horizontal space alongside the filter control
