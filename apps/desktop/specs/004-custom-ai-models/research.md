# Research: 004 custom AI models

## 1. Persistence format and storage

**Decision**: Store custom models in a new `custom_chat_models` SQLite table in the existing `singapur_cards.db`, accessed via three new Tauri commands (`list_custom_models`, `add_custom_model`, `delete_custom_model`) following the established `rusqlite` + `AppState` pattern. Schema: `id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, title TEXT NOT NULL, provider TEXT NOT NULL, created_at TEXT NOT NULL`.

**Rationale**: Consistent with how the rest of the app (chat, cards, credentials) stores device-local data; benefits from the existing DB connection, migration runner, and command patterns in `schema.rs` / `queries.rs` / `commands/`; avoids `localStorage` quota limits and serialization churn; `provider` is now required so a relational row is cleaner than a JSON blob.

**Alternatives considered**: `localStorage` JSON array — rejected in favour of consistency with existing app storage patterns and stronger Constitution II (Local data safety) guarantees.

---

## 2. Identifier normalization (FR-005)

**Decision**: Before any comparison or save: `trim()` both sides; compare using **case-insensitive** string equality (`toLowerCase()` on ASCII range; sufficient for OpenRouter-style ids used today). Reject save if normalized `name` matches any saved entry after the same normalization.

**Rationale**: Matches Clarifications session 2026-03-29.

**Alternatives considered**: Unicode case folding (`localeCompare`) — defer unless non-ASCII ids appear.

---

## 3. Fallback model (FR-010)

**Decision**: When the active model is removed, set selection to the first model in FR-012 order (first saved model by title), or `null` if none remain.

**Rationale**: No built-in catalog exists; the DB starts empty so there is no stable hardcoded default to reference.

---

## 4. UI: additions + modal

**Decision**: Use Semantic UI `Dropdown` with **`allowAdditions`**, **`additionLabel`** invoking **Add new…**, **`onAddItem`** opening a small **Modal** with two inputs (Model id / Display title) and Save/Cancel. On Save, validate, persist, close, refresh options.

**Rationale**: Aligns with `save-models-prompt.md` and existing `SUIDropdown` in `ChatComposer`.

**Alternatives considered**: Inline only without modal — worse validation UX; spec wants explicit dialog.

---

## 5. Deletion UX (FR-008)

**Decision**: **“Manage models”** secondary control (link or small button) near the model dropdown opening a **Modal** listing **only user-saved** rows with identifier, title, and **Delete** per row. Inline × on dropdown items is optional later; modal satisfies FR-008 with minimal Dropdown API surface.

**Rationale**: Clear bulk visibility; avoids crowding the inline menu; matches spec “or dedicated management view”.

**Alternatives considered**: Delete icon only in dropdown — acceptable but harder with Semantic grouped options; deferred.

---

## 6. Ordering (FR-012)

**Decision**: Build options array as saved entries sorted by `title.trim()` case-insensitive (`localeCompare`). DB starts empty; no built-in catalog.

**Rationale**: Matches updated Clarifications.

---

## 7. Storage errors / quota

**Decision**: Wrap `invoke` calls in `try/catch`; on failure show non-blocking toast or inline banner and keep in-memory list only for the session (spec: clear error, no crash).

**Rationale**: Constitution II + spec edge cases.
