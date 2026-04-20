## 1. Testing Foundation

- [x] 1.1 Confirm and standardize the project test command in `package.json` so it is consistent for local and CI usage
- [x] 1.2 Add or update shared test utilities, mocks, and setup needed for deterministic React Native/Expo tests

## 2. Core Coverage for Critical Flows

- [x] 2.1 Add component tests for high-reuse UI building blocks (including key card/review list presentation and interaction behavior)
- [x] 2.2 Add route-level integration tests for critical screen and navigation outcomes
- [x] 2.3 Add logic-focused tests for review session, collection membership, and local data/state transitions

## 3. Merge Readiness Enforcement

- [x] 3.1 Update contributor documentation/checklists to require a passing test run before requesting review
- [x] 3.2 Ensure CI executes the same test command and blocks merges when tests fail
