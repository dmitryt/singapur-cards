# Project Overview

## Product

Singapur Cards is an offline-first vocabulary learning app that imports ABBYY Lingvo DSL dictionaries, supports local search, and turns entries into study cards with practice sessions.

## Current Runtime Scope

- Desktop app is implemented in `apps/desktop`
- No central backend service
- Local-first data model with SQLite as source of truth
- Optional network usage only for AI chat requests to OpenRouter

## Primary Boundaries

- Frontend: React + TypeScript UI, routing, and state
- Local backend: Tauri Rust commands for filesystem, parsing, data writes, and secure key resolution
- Persistence: SQLite for app data, OS keychain for raw API keys
- External integration: OpenRouter for chat completions

## Feature Domains

- [Cards](../features/cards.md)
- [Collections](../features/collections.md)
- [Practice](../features/practice.md)
- [Dictionaries](../features/dictionaries.md)
- [Languages](../features/languages.md)
- [User Profile](../features/user-profile.md)
- [Models](../features/models.md)
- [AI Chat](../features/ai-chat.md)

## Reading Order

1. [Architecture](../architecture/system-architecture.md)
2. [Core Entities](../data/core-entities.md)
3. [Flows](../flows/core-flows.md)
4. [Features](../features/)
5. [Platforms](../platforms/desktop-vs-mobile.md)
