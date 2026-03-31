# Project Overview

## Product

Singapur Cards is an offline-first vocabulary learning app that imports ABBYY Lingvo DSL dictionaries, supports local search, and turns entries into study cards with review sessions.

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

- Desktop Vocabulary Learning MVP
- Language and Dictionary Management + Search Overhaul
- AI Chat for Vocabulary Practice
- Custom AI Models

## Reading Order

1. `architecture/system-architecture.md`
2. `data/core-entities.md`
3. `flows/core-flows.md`
4. `features/*.md`
5. `platforms/desktop-vs-mobile.md`
