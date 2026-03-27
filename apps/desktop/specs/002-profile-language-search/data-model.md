# Data Model: Profile Page, Language Management & Search Bar Overhaul

## Entities

### Language (new)

Persisted in SQLite table `languages`.

| Field      | Type   | Constraints                                              |
|------------|--------|----------------------------------------------------------|
| code       | TEXT   | PRIMARY KEY, NOT NULL, LENGTH(code)=2, code=LOWER(code) |
| title      | TEXT   | NOT NULL                                                 |
| created_at | TEXT   | NOT NULL (ISO 8601 datetime string)                      |

**Validation rules:**
- `code` must match `/^[a-z]{2}$/` — enforced at both the Tauri command layer (Rust check) and the SQLite CHECK constraint.
- `title` must be non-empty — enforced at the Tauri command layer.
- `code` is immutable after creation (no update endpoint for code).

**Seeding:**
- On first run, `('en', 'English', datetime('now'))` is inserted with `INSERT OR IGNORE`.

**Invariant:**
- At least one language must always exist. The `delete_language` command refuses deletion when `COUNT(*) <= 1`.

---

### Headword (existing, read-only in this feature)

Headwords are sourced from `dictionary_entries` joined with `dictionaries`. No schema changes.

| Field      | Source Table       | Used for                         |
|------------|--------------------|----------------------------------|
| headword   | dictionary_entries | Displayed in headword dropdown   |
| language   | dictionaries.language_from | Filter by selected language |

Query for headword dropdown:
```sql
SELECT DISTINCT de.headword
FROM dictionary_entries de
JOIN dictionaries d ON d.id = de.dictionary_id
WHERE d.language_from = ?1 AND d.import_status = 'ready'
ORDER BY de.headword ASC
LIMIT ?2
```

---

## State (Frontend)

### languageSlice (Zustand)

| Field                  | Type       | Description                                          |
|------------------------|------------|------------------------------------------------------|
| languages              | Language[] | All stored languages, loaded on ProfilePage mount    |
| isLoadingLanguages     | boolean    | Loading indicator for language fetch                 |
| selectedSearchLanguage | string     | ISO code of currently selected language in search bar; persists for session |
| headwordsForLanguage   | string[]   | Headwords for selectedSearchLanguage                 |
| isLoadingHeadwords     | boolean    | Loading indicator for headword fetch                 |

**State transitions:**
1. `loadLanguages()` → sets `languages`; if `selectedSearchLanguage` is unset, sets it to `languages[0].code`;
2. `setSelectedSearchLanguage(code)` → clears `headwordsForLanguage`, triggers `loadHeadwordsForLanguage(code)`
3. `createLanguage / updateLanguage / deleteLanguage` → mutate DB, then call `loadLanguages()` to refresh

---

## Relationships

```
languages ─────────────────────────────────────────────────────────────────────
    1 language.code = dictionaries.language_from (logical, not FK)
dictionaries ──── dictionary_entries (FK: dictionary_id)
                  headword field sourced here for dropdown
```

No foreign key from `dictionary_entries` to `languages` — deletion of a language does not cascade to headwords (per clarification).

---

## No Schema Changes to Existing Tables

The following tables are unchanged by this feature:

- `dictionaries`
- `dictionary_entries` / `dictionary_entries_fts`
- `cards`
- `collections` / `collection_memberships`
- `review_events`
