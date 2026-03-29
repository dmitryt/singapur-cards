# 🃏 Singapur Cards

> Offline-first vocabulary learning app powered by ABBYY Lingvo DSL dictionaries.

Singapur Cards lets you turn any ABBYY Lingvo `.dsl` dictionary into a personal flashcard deck — no internet required. Import a dictionary, search headwords instantly, build your card collections, and drill vocabulary at your own pace with built-in review sessions.

## ✨ Features

- 📖 **Import DSL dictionaries** — load ABBYY Lingvo `.dsl` files from your local machine
- 🔍 **Fast headword search** — exact and prefix matching across large dictionaries
- 🃏 **Flashcard creation** — save any dictionary entry as a study card
- 🗂️ **Collections** — organize cards into named collections for focused study
- 🔁 **Review sessions** — mark cards as learned or not, with persisted progress
- 🤖 **AI Assistant** — built-in chat assistant to help you learn; connects to [OpenRouter](https://openrouter.ai) for access to a wide range of AI models
- ✈️ **Fully offline** — all data stays local in SQLite; no account or network needed (except for AI features)

## 📦 Apps

| App | Description |
|-----|-------------|
| [🖥️ Desktop](./apps/desktop) | Native desktop client built with Tauri v2, React, and SQLite |
| 📱 Mobile | Native mobile client — _in progress_ |

## 🛠️ Tech Stack

- **Desktop:** Tauri v2 (Rust) + React + TypeScript + Vite
- **UI:** Semantic UI React + styled-components
- **State:** Zustand
- **Database:** SQLite (rusqlite + Tauri SQL plugin)
- **AI:** @assistant-ui/react + OpenRouter (configurable model backends)
- **Testing:** Vitest + Rust unit/integration tests

## 🚀 Getting Started

See the [Desktop app README](./apps/desktop/README.md) for setup instructions.
