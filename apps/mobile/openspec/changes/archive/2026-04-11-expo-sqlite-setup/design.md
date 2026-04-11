## Context

This is a greenfield React Native mobile app within the `apps/mobile` monorepo workspace. No existing code exists to migrate. The goal is to establish a production-ready baseline using Expo's managed workflow, with SQLite for local-first data persistence.

The app targets iOS and Android. Development tooling should support hot reload, TypeScript type checking, and EAS builds.

## Goals / Non-Goals

**Goals:**
- Initialize an Expo managed-workflow project with TypeScript
- Integrate `expo-sqlite` with a singleton database helper and migration runner
- Establish a minimal app shell (entry point, root layout, one placeholder screen)
- Configure `expo-router` for file-based navigation
- Set up EAS build configuration (`eas.json`)

**Non-Goals:**
- Implement any product features or screens beyond a placeholder
- Set up CI/CD pipelines or deployment automation
- Configure push notifications, analytics, or other Expo services
- Authentication or networking layers

## Decisions

### Managed Workflow over Bare
Expo managed workflow is chosen over bare/ejected because it minimizes native configuration overhead for a new project. `expo-sqlite` is supported in managed workflow via Expo's module system without requiring custom native code.

**Alternatives considered:** Bare workflow — rejected because it adds native build complexity with no benefit at this stage. Can always eject later.

### expo-router for Navigation
`expo-router` (file-based routing) is chosen over React Navigation configured manually. It is the recommended navigation solution for new Expo projects and integrates cleanly with TypeScript and deep linking.

**Alternatives considered:** React Navigation v6 with manual stack setup — rejected for higher boilerplate in a greenfield project.

### SQLite Singleton + Migration Table
The database will be accessed through a single module (`src/db/index.ts`) that opens the SQLite database once and exposes it. Migrations are tracked in a `_migrations` table with a monotonic version integer. Each migration is an idempotent SQL string applied in order on startup.

**Alternatives considered:** Drizzle ORM / TypeORM — rejected as over-engineering for an empty project. A plain migration runner is simpler and has no runtime overhead. ORM can be layered on top later.

### TypeScript Strict Mode
`tsconfig.json` will use `"strict": true` from the start. Looser configs are harder to tighten later.

## Risks / Trade-offs

- **Expo SDK version lock-in** → Mitigation: Pin to the latest stable SDK at time of init; upgrade as a deliberate future task.
- **expo-sqlite API surface changes** → Mitigation: Abstract all DB access behind `src/db/index.ts`; callers never import expo-sqlite directly.
- **Migration runner is hand-rolled** → Mitigation: Keep it simple (append-only array of SQL strings); document the pattern clearly in code comments.

## Migration Plan

1. Run `npx create-expo-app` in `apps/mobile`
2. Add `expo-sqlite`, configure with `expo install`
3. Add `expo-router`, update `app.json` entry point
4. Create `src/db/` module with migration runner
5. Add `eas.json` with default development/preview/production profiles
6. Smoke-test on iOS simulator and Android emulator
7. Commit with `[chore] initialize expo + sqlite project`
