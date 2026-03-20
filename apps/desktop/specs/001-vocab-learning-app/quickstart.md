# Quickstart: Vocabulary Learning Desktop App

**Branch**: `001-vocab-learning-app` | **Date**: 2026-03-19

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | 1.75+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node.js | 20+ LTS | [nodejs.org](https://nodejs.org) or `brew install node` |
| npm | 8+ | `npm install -g npm` |
| Tauri CLI v2 | 2.x | `cargo install tauri-cli --version "^2"` |

**macOS only**: Xcode Command Line Tools required (`xcode-select --install`).

**Windows only**: WebView2 Runtime and Microsoft C++ Build Tools required.

---

## Project Setup

```bash
# From monorepo root
cd apps/desktop

# Install JS dependencies
npm install

# Verify Tauri environment
cargo tauri info
```

---

## Development

```bash
# Start dev server (hot reload for frontend + Rust rebuild on change)
cargo tauri dev

# Frontend only (no Tauri window — useful for component work)
npm dev
```

The SQLite database is created automatically on first launch at:
- **macOS**: `~/Library/Application Support/com.singapur-cards/cards.db`
- **Windows**: `%APPDATA%\com.singapur-cards\cards.db`

---

## Running Tests

```bash
# Rust unit + integration tests
cd src-tauri
cargo test

# Frontend tests
npm test

# Frontend tests with UI
npm test --ui

# Frontend coverage
npm test --coverage
```

---

## Building for Production

```bash
# From apps/desktop
cargo tauri build
```

Output bundles appear in `src-tauri/target/release/bundle/`:
- macOS: `.dmg` and `.app`
- Windows: `.msi` and `.exe`

---

## Project Structure

```
apps/desktop/
├── src/                          # React frontend
│   ├── components/
│   │   ├── atoms/                # Button, Input, Badge, Spinner, ProgressBar
│   │   ├── molecules/            # SearchBar, SearchResultCard, FlashCardTile, CollectionBadge, CollectionForm, ReviewControls
│   │   ├── organisms/            # SearchResultList, CardGrid, CardDetail, CollectionList, FlipCard, SessionStats, Sidebar
│   │   └── templates/            # AppShell, PageContainer
│   ├── pages/
│   │   ├── SearchPage.tsx
│   │   ├── LibraryPage.tsx
│   │   ├── CollectionsPage.tsx
│   │   └── ReviewPage.tsx
│   ├── store/
│   │   ├── index.ts              # Root store (single create() with slices)
│   │   └── slices/
│   │       ├── dictionarySlice.ts
│   │       ├── cardSlice.ts
│   │       └── reviewSessionSlice.ts
│   ├── lib/
│   │   └── tauri/
│   │       └── commands.ts       # Typed invoke() wrappers — never call invoke() in components
│   ├── theme/
│   │   ├── theme.ts
│   │   ├── styled.d.ts           # DefaultTheme augmentation
│   │   └── GlobalStyles.ts
│   ├── test/
│   │   ├── setup.ts
│   │   └── __mocks__/
│   │       └── @tauri-apps/api/core.ts   # vi.fn() mock for invoke
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs         # DDL + migration runner
│   │   │   └── queries.rs        # All SQL queries (no inline SQL elsewhere)
│   │   ├── dsl/
│   │   │   ├── mod.rs
│   │   │   ├── parser.rs         # Line-by-line state machine + nom tag parser
│   │   │   └── importer.rs       # Streaming import with progress callback
│   │   ├── commands/
│   │   │   ├── dictionary.rs     # search_dictionary, import_dictionary, delete_dictionary
│   │   │   ├── cards.rs          # save_card, load_cards, update_card, delete_card
│   │   │   ├── collections.rs    # create/rename/delete_collection, assign/remove card
│   │   │   └── review.rs         # start_review_session, mark_card_reviewed
│   │   ├── models.rs             # Shared Rust structs (serializable)
│   │   ├── state.rs              # AppState / DbPool setup
│   │   └── main.rs
│   ├── tests/
│   │   ├── dsl_parser_tests.rs
│   │   └── db_integration_tests.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Key Cargo Dependencies

```toml
[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled", "fts5"] }
r2d2 = "0.8"
r2d2_sqlite = "0.24"
encoding_rs = "0.8"
nom = "7"
uuid = { version = "1", features = ["v4"] }
tokio = { version = "1", features = ["full"] }

[dev-dependencies]
tempfile = "3"
```

## Key npm Dependencies

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "styled-components": "^6",
    "zustand": "^5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6",
    "@testing-library/react": "^16",
    "@testing-library/user-event": "^14",
    "@types/react": "^18",
    "@types/styled-components": "^5",
    "typescript": "^5",
    "vite": "^5",
    "vitest": "^2",
    "jsdom": "^24"
  }
}
```

---

## TDD Workflow (Constitution §III)

1. Write the test (Rust `#[test]` or Vitest `it(...)`) — commit.
2. Show test fails: `cargo test` or `npm test`.
3. Implement the minimum code to make the test pass.
4. Refactor with tests green.

**Never skip step 1.** PRs that add implementation without tests will not be merged.
