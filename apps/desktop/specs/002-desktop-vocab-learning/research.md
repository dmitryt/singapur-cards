# Research: Desktop Vocabulary Learning MVP

## Decision 1: Use Tauri v2 with a Rust-first local data layer

**Decision**: Keep file import, DSL parsing, SQLite access, and command orchestration in the Tauri Rust layer, while React handles rendering and interaction state.

**Rationale**: Large dictionary files and local file access are better handled in the native layer than in the browser context. This keeps import and search fast, limits memory pressure in the webview, and aligns with the desktop-first and offline requirements from the constitution.

**Alternatives considered**:
- Parse DSL files in the frontend: rejected because large imports would compete with UI rendering and make local file handling more fragile.
- Build a separate local API service: rejected because it adds process complexity without clear MVP value.

## Decision 2: Use SQLite as the single source of truth for dictionaries, cards, and review state

**Decision**: Store imported dictionaries, including their source and target language metadata, normalized entries, cards, collections, and review state in a single local SQLite database managed by migrations at startup.

**Rationale**: SQLite fits the offline, single-user desktop model and gives strong local durability with simple deployment. Startup migrations keep schema changes controlled and reversible. SQLite also allows fast indexed lookups without introducing a separate search service.

**Alternatives considered**:
- JSON or file-based storage only: rejected because search, filtering, and data integrity become harder as dictionaries and cards grow.
- A client/server database: rejected because it violates the MVP's offline-first simplicity.

## Decision 3: Use SQLite full-text search plus normalized lookup fields for dictionary search

**Decision**: Build the search experience on top of normalized headword fields and a SQLite full-text search index, with lightweight ranking logic for exact, partial, and fuzzy-friendly results, while filtering eligible entries by the selected dictionary source language.

**Rationale**: The product must stay responsive with large dictionaries. SQLite indexing keeps search local and fast, while normalized fields support prefix and partial lookup. This is the simplest design that still scales beyond small hobby datasets.

**Alternatives considered**:
- In-memory search only: rejected because large dictionaries would increase startup cost and memory use.
- A dedicated search engine: rejected because it introduces unnecessary operational complexity for a local desktop MVP.

## Decision 4: Keep Zustand limited to UI and session state, not canonical content

**Decision**: Use small feature-specific Zustand stores for active search query, selected result, editor draft state, active collection filters, and review session state. Persist only lightweight preferences and in-progress UI state when needed.

**Rationale**: Zustand is a good fit for simple desktop UI coordination, but imported content and learning records should remain in SQLite so there is only one source of truth. This avoids state duplication and keeps rehydration behavior predictable across app restarts.

**Alternatives considered**:
- Store canonical cards and dictionaries in Zustand persistence: rejected because it duplicates database state and raises consistency risks.
- Use a larger global state framework: rejected because it adds boilerplate without solving a real MVP problem.

## Decision 5: Use Semantic UI React selectively and styled-components for app-specific styling

**Decision**: Use Semantic UI React for common interface primitives such as forms, inputs, buttons, layout helpers, and modal flows, while using styled-components for app theming, page composition, spacing, and any custom learning UI.

**Rationale**: This balances quick UI delivery with enough control to create a polished desktop look. Research indicates Semantic UI React carries maintenance risk, so the plan keeps it at the edges rather than making the whole design dependent on deep internal overrides.

**Alternatives considered**:
- Use Semantic UI React for all styling and theming: rejected because deep overrides would create maintenance friction.
- Replace the library with a different component system: rejected for now because the user explicitly selected Semantic UI React for the MVP.

## Decision 6: Use layered verification instead of heavy end-to-end automation in the first iteration

**Decision**: Verify parser and database behavior with Rust tests, verify frontend components and stores with Vitest and React Testing Library, and document manual smoke checks for app startup, import, persistence, and offline review flows.

**Rationale**: The constitution requires at least one verification path for changed behavior. This layered approach covers the highest-risk logic without introducing a large end-to-end harness before the feature set is stable.

**Alternatives considered**:
- Rely on manual testing only: rejected because parser, search, and local data changes are too easy to regress silently.
- Introduce full desktop end-to-end automation immediately: rejected because it adds tooling complexity before the UI contracts stabilize.

## Decision 7: Restrict native capabilities to the minimum required for local files, dialogs, and SQL access

**Decision**: Scope Tauri capabilities to file selection, app-owned storage access, and the SQL operations needed by the MVP commands.

**Rationale**: Limiting capabilities reduces accidental exposure and keeps the desktop shell aligned with the constitution's data-safety principle.

**Alternatives considered**:
- Grant broad native access by default: rejected because it increases risk without improving the user experience.
- Push all persistence through browser-only APIs: rejected because it weakens control over local file handling and data durability.
