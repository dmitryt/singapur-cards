# Singapur Cards Developer Docs

## Structure

- [`Project Overview`](./overview/) - product scope and documentation map
- **`Features`** - one file per feature domain
  - [`Cards`](./features/cards.md)
  - [`Collections`](./features/collections.md)
  - [`Reviews`](./features/reviews.md)
  - [`Dictionaries`](./features/dictionaries.md)
  - [`Languages`](./features/languages.md)
  - [`User Profile`](./features/user-profile.md)
  - [`Models`](./features/models.md)
  - [`AI Chat`](./features/ai-chat.md)
- **`Data Structure`** - shared entities and TypeScript-oriented data contracts
  - [`Core Entities`](./data/core-entities.md)
  - [`SQL Schemas`](./data/sql-schemas.md)
- [`Flows`](./flows/) - core end-to-end user/system flows
- [`Architecture`](./architecture/) - frontend/Tauri/storage/provider boundaries
- [`Platform`](./platforms/) - platform-specific notes and current parity status

## Scope

- Implemented platform: desktop (Tauri v2 + React + SQLite)
- Planned platform: mobile (not implemented in this repository yet)
