# Singapur Cards Desktop Constitution

## Core Principles

### I. Desktop-First Experience
The application MUST behave like a desktop product first: core flows are keyboard and mouse friendly, windowed usage is supported, and primary actions remain understandable without external documentation.

### II. Local Data Safety
User data stored on the device MUST be kept in application-owned locations, written defensively, and never deleted or overwritten without an explicit user action or a clearly reversible workflow.

### III. Stable Offline Behavior
Core application features MUST work without requiring continuous network access unless the feature itself is explicitly online-only. Network failures MUST fail gracefully and keep the app usable.

### IV. Basic Quality Gates
New or changed user-facing behavior MUST have at least one verification path before release, preferably an automated test and otherwise a documented manual check. Crashes, startup failures, and data corruption risks take priority over feature completeness.

### V. Keep It Simple
Prefer the smallest implementation that satisfies the requirement. New dependencies, background processes, and platform-specific behavior MUST be justified by clear user value.

## Platform Requirements

The application SHOULD support the target desktop platforms defined by the project scope and MUST fail predictably on unsupported systems. Build and packaging choices SHOULD favor repeatable local development, straightforward installation, and safe application updates.

## Development Workflow

Changes SHOULD be small, reviewable, and reversible. Before merging, contributors MUST verify that the app starts, the modified flow works as intended, and no existing local data handling behavior is accidentally broken.

## Governance

This constitution is the default standard for all desktop application decisions in this project. Any exception MUST be documented in the relevant spec or change proposal with a short rationale. Amendments require updating this file and recording the new version and amendment date.

**Version**: 1.0.0 | **Ratified**: 2026-03-20 | **Last Amended**: 2026-03-20
