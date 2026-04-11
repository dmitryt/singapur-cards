## Why

The mobile app needs a foundational project structure before any features can be built. Setting up React Native with Expo and SQLite support provides a working baseline with local persistence, enabling future development of offline-first features.

## What Changes

- Initialize a new React Native + Expo project (bare or managed workflow)
- Add and configure `expo-sqlite` for local relational data storage
- Set up basic project structure (navigation shell, entry point)
- Add TypeScript configuration
- Configure EAS (Expo Application Services) build settings

## Capabilities

### New Capabilities

- `project-foundation`: Base Expo + React Native project with TypeScript, entry point, and navigation shell
- `sqlite-storage`: Local SQLite database integration via `expo-sqlite`, including a db helper/singleton and schema migration setup

### Modified Capabilities

<!-- None — this is a greenfield project setup -->

## Impact

- Creates the `apps/mobile` project from scratch
- Adds dependencies: `expo`, `react-native`, `expo-sqlite`, `expo-router` (or React Navigation), TypeScript toolchain
- No existing code is affected; this is a new project initialization
