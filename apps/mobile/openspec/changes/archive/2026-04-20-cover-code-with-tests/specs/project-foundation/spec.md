## MODIFIED Requirements

### Requirement: Expo managed project is initialized
The project SHALL be a valid Expo managed-workflow app bootstrapped with `create-expo-app`, using TypeScript, targeting iOS and Android, and including an automated test command in `package.json` for contributor and CI validation.

#### Scenario: Project builds without errors
- **WHEN** a developer runs `npx expo start`
- **THEN** the Metro bundler starts without errors and the app loads on a simulator/emulator

#### Scenario: TypeScript is enforced
- **WHEN** a `.ts` or `.tsx` file contains a type error
- **THEN** `tsc --noEmit` reports the error and exits non-zero

#### Scenario: Automated test command is available
- **WHEN** a developer runs the documented test command from `package.json`
- **THEN** the test runner executes the mobile test suite and exits non-zero on failures
