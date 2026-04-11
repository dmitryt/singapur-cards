### Requirement: Expo managed project is initialized
The project SHALL be a valid Expo managed-workflow app bootstrapped with `create-expo-app`, using TypeScript, targeting iOS and Android.

#### Scenario: Project builds without errors
- **WHEN** a developer runs `npx expo start`
- **THEN** the Metro bundler starts without errors and the app loads on a simulator/emulator

#### Scenario: TypeScript is enforced
- **WHEN** a `.ts` or `.tsx` file contains a type error
- **THEN** `tsc --noEmit` reports the error and exits non-zero

### Requirement: File-based navigation is configured
The app SHALL use `expo-router` for navigation, with a root layout and at least one placeholder index screen.

#### Scenario: Index screen renders
- **WHEN** the app launches
- **THEN** the root `app/index.tsx` screen is displayed without a crash

#### Scenario: Navigation shell is present
- **WHEN** the app launches
- **THEN** a root `_layout.tsx` exists and wraps the screen tree

### Requirement: EAS build configuration exists
The project SHALL include an `eas.json` with `development`, `preview`, and `production` build profiles.

#### Scenario: EAS config is valid
- **WHEN** `eas build --help` or `eas build:list` is run in the project directory
- **THEN** no configuration errors are reported
