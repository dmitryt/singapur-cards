# Singapur Cards Desktop Constitution

## Core Principles

### I. Desktop-First
The application is a native desktop experience; UI must feel native and responsive; no web-only assumptions — offline capability is the default, network is optional.

### II. Component Isolation
UI components must be self-contained and independently renderable; business logic lives in the Rust/Node.js core, not in the frontend; clear boundary between view layer and data layer.

### III. Test-First (NON-NEGOTIABLE)
TDD mandatory: tests written → user approved → tests fail → then implement; unit tests for Rust/Node.js core functions; component tests for UI; Red-Green-Refactor cycle strictly enforced.

### IV. Simplicity
Start with the minimum viable implementation; YAGNI — no speculative features; prefer plain data structures over complex abstractions; complexity must be justified by a concrete requirement.

### V. Data Integrity
User data is never silently mutated or lost; all destructive operations require explicit confirmation;

## Development Workflow

- All features start from a spec; no implementation without a written spec
- PRs must include tests; failing tests block merge
- Breaking changes to data schemas require a migration path

## Governance

- This constitution supersedes all other practices. Amendments require updating this file with a rationale comment and bumping the version. All feature specs must reference and comply with these principles.
- Amendments must bump the version and dates below and align related templates/checklists in this repo.

**Version**: 1.0.0 | **Ratified**: 2026-03-19 | **Last Amended**: 2026-03-19
