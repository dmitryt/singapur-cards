# Platform Notes: Desktop vs Mobile

## Current Status

- Desktop: implemented in `apps/desktop` with Tauri v2 + React + SQLite.
- Mobile: not implemented in this repository; `apps/mobile` currently contains planning/tooling artifacts only.

## Capability Matrix

| Capability | Desktop | Mobile |
|---|---|---|
| DSL import and indexing | Implemented | Not implemented |
| Headword search and detail | Implemented | Not implemented |
| Card and collection management | Implemented | Not implemented |
| Review sessions | Implemented | Not implemented |
| AI chat and API key flow | Implemented | Not implemented |
| Custom model management | Specified for desktop scope | Not implemented |

## Storage Strategy

- Desktop:
  - SQLite for product data.
  - OS keychain for raw API keys.
- Mobile (planned target from prompt context):
  - AsyncStorage and/or SQLite for local data.
  - Equivalent secure credential storage mechanism required for API keys.

## Implementation Guidance

- Keep domain semantics aligned across platforms (entity names, status enums, command intent).
- Put platform divergences in this folder to avoid duplicating feature docs.
- Avoid implying mobile behavior until real mobile contracts and code exist.
