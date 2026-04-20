## Why

The mobile app has core feature specs but lacks a consistent automated test baseline to protect against regressions. Adding targeted tests now will make refactors and feature work safer and faster.

## What Changes

- Add a dedicated testing capability that defines required automated test coverage for critical app flows and shared building blocks.
- Introduce and standardize unit and integration-style tests for key UI, data, and session behaviors.
- Define a minimum expectation for test execution in local development and CI before merging.

## Capabilities

### New Capabilities
- `mobile-test-coverage`: Defines the required automated test baseline across critical app functionality, including coverage scope and execution expectations.

### Modified Capabilities
- `project-foundation`: Clarify that project setup and contribution workflow include running the app test suite as a merge readiness requirement.

## Impact

- Affected code: test files under `src/` for components, app routes, and state/data logic; shared test utilities and mocks.
- Tooling: test runner configuration and scripts in `package.json`.
- Delivery workflow: PR validation and developer checklist now include passing tests.
