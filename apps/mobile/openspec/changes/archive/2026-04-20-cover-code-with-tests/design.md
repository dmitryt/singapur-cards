## Context

The project already defines product-facing capabilities for cards, collections, review, sync, and storage, but test expectations are not consistently specified across modules. Current contributor flow does not enforce a baseline test run before merge, which increases regression risk as the codebase grows.

## Goals / Non-Goals

**Goals:**
- Define a clear automated test baseline for critical mobile behaviors.
- Standardize test categories (component, route integration, data/session logic) and expected tooling.
- Make test execution part of merge-readiness for contributors and CI.

**Non-Goals:**
- Achieving 100% code coverage.
- Replacing manual QA for UX or device-specific validation.
- Introducing end-to-end device farm infrastructure in this change.

## Decisions

- Introduce a dedicated `mobile-test-coverage` capability to describe required testing scope independently from feature specs. This keeps testing policy explicit and reusable.
- Modify `project-foundation` to include mandatory test execution in baseline project workflow, since merge readiness belongs in foundation requirements.
- Scope required coverage to high-risk and high-change surfaces (shared UI components, route-level behavior, data/review state transitions) rather than every file, balancing confidence with delivery speed.
- Prefer existing JavaScript/TypeScript test tooling and scripts defined in `package.json` to avoid unnecessary infrastructure churn.

## Risks / Trade-offs

- [Risk] Increased short-term development time while initial tests are added. -> Mitigation: prioritize critical paths first and expand iteratively.
- [Risk] Flaky tests reduce trust in the suite. -> Mitigation: require deterministic mocks/fixtures and avoid timing-dependent assertions.
- [Trade-off] Baseline coverage targets might miss edge-case regressions. -> Mitigation: combine baseline automation with focused manual exploratory testing for risky releases.
