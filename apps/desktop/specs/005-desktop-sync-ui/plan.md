# Implementation Plan: Desktop Sync UI

**Branch**: `005-desktop-sync-ui` | **Date**: 2026-04-13 | **Spec**: `specs/005-desktop-sync-ui/spec.md`  
**Input**: Feature specification from `apps/desktop/specs/005-desktop-sync-ui/spec.md`

## Summary

Add a "Desktop Sync" settings section to `ProfilePage` that lets users start pairing mode, view paired mobile devices, and forget devices. All three backend Tauri commands are already implemented (`sync_start_pairing`, `sync_get_paired_devices`, `sync_forget_device`). The work is: (1) a minor Rust struct addition to surface the desktop display name, (2) three typed command wrappers in `commands.ts`, and (3) a self-contained `DesktopSyncSection` React component.

## Technical Context

**Language/Version**: TypeScript 5.6 (frontend), Rust 1.x (backend — already implemented)  
**Primary Dependencies**: React 18, Tauri v2, styled-components, semantic-ui-react (`<Confirm>`)  
**Storage**: SQLite via rusqlite (backend only; frontend is read-only via invoke)  
**Testing**: Vitest + React Testing Library (same as existing `src/test/`)  
**Target Platform**: Desktop (macOS primary; cross-platform via Tauri)  
**Project Type**: Desktop app (Tauri)  
**Performance Goals**: Polling every 2s; countdown every 1s — no special perf requirements  
**Constraints**: Must not add new routes or sidebar nav entries; no new Redux state  
**Scale/Scope**: Single settings section, ~3 UI states, ~250 lines of new frontend code

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Desktop-First | PASS | Settings section in ProfilePage; keyboard/mouse friendly |
| II. Local Data Safety | PASS | UI only reads/deletes via backend; no raw DB access from frontend |
| III. Stable Offline Behavior | PASS | Error state shown when sync server unavailable; app remains usable |
| IV. Basic Quality Gates | PASS | Acceptance scenarios in spec serve as manual verification checklist; unit test for DesktopSyncSection planned |
| V. Keep It Simple | PASS | No new route, no Redux slice, no new dependencies; ~3 state variants |

No violations.

## Project Structure

### Documentation (this feature)

```text
apps/desktop/specs/005-desktop-sync-ui/
├── spec.md
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── tauri-commands.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code Changes

```text
apps/desktop/
├── src-tauri/src/sync/
│   ├── types.rs              # ADD displayName field to PairingModeInfo
│   └── server.rs             # populate displayName from state.local_display_name
│
└── src/
    ├── lib/tauri/commands.ts # ADD: PairingModeInfo, PairedDevice types + 3 wrappers
    └── features/sync/
        └── DesktopSyncSection.tsx  # NEW: self-contained sync settings section
    └── pages/
        └── ProfilePage.tsx   # MODIFY: import + render <DesktopSyncSection />
```

**Structure Decision**: Single desktop app structure. New frontend code lives in `src/features/sync/` (domain-grouped, consistent with `features/chat/`). Backend changes are minimal Rust additions to existing files — no new Rust modules.

## Implementation Phases

### Phase A — Backend patch (minor Rust)

**Files**: `src-tauri/src/sync/types.rs`, `src-tauri/src/sync/server.rs`

1. Add `display_name: String` field to `PairingModeInfo` struct (with `#[serde(rename = "displayName")]`).
2. In `start_pairing()`, populate it from `state.local_display_name.clone()`.
3. `cargo build` to confirm no regressions.

### Phase B — Frontend command wrappers

**File**: `src/lib/tauri/commands.ts`

Add types and wrappers (see `contracts/tauri-commands.md`):
- `PairingModeInfo` type (including `displayName`)
- `PairedDevice` type
- `syncStartPairing()` — try/catch invoke, returns `CommandResult<PairingModeInfo>`
- `syncGetPairedDevices()` — try/catch invoke, returns `CommandResult<PairedDevice[]>`
- `syncForgetDevice(deviceId)` — try/catch invoke, returns `CommandResult<void>`

### Phase C — DesktopSyncSection component

**File**: `src/features/sync/DesktopSyncSection.tsx`

State machine (see `data-model.md`):
- `idle` → shows "Start Pairing" button; empty-state message if no devices
- `pairing` → shows host:port, desktopDisplayName, 6-digit code, countdown "Expires in N s"; polls `syncGetPairedDevices` every 2s
- `paired` → shows device list (name + lastSyncAt or "Never synced") + "Forget" per row
- `error` → shows error message, sync unavailable notice

**On mount**: call `syncGetPairedDevices()`:
  - error → `error` state
  - 0 devices → `idle`
  - ≥1 devices → `paired`

**Start Pairing**:
  - Call `syncStartPairing()`; on success → `pairing` state
  - Start 1s countdown interval (from `expiresAt`)
  - Start 2s polling interval for `syncGetPairedDevices`
  - On new device detected → clear intervals → `paired` state
  - On countdown → 0 → clear intervals → `idle` state (with brief "Session expired" notice)

**Forget**:
  - `<Confirm>` dialog (semantic-ui-react, matching `LibraryPage` / `CollectionsPage` pattern)
  - On confirm → `syncForgetDevice(id)` → re-fetch `syncGetPairedDevices` → update `paired` state (or → `idle` if list now empty)

**Styling**: Use existing `Section`, `Label`, `Button`, `StatusText` styled-components pattern from `ProfilePage.tsx`. Extend as needed.

### Phase D — Wire into ProfilePage

**File**: `src/pages/ProfilePage.tsx`

Replace the `// TODO: Desktop Sync section` comment block with `<DesktopSyncSection />`.

### Phase E — Test

**File**: `src/test/DesktopSyncSection.test.tsx`

Test cases (mock `invoke` via `__mocks__`):
- Renders empty state when no devices
- Renders device list when devices exist
- Start Pairing shows code + countdown
- Countdown expiry returns to idle
- Forget device triggers Confirm then removes device
- Error state when sync server unavailable

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| State management | Local component state | Sync state is transient UI; no cross-component sharing needed |
| Polling | `setInterval` in `useEffect` | Spec requirement is exactly this; no library needed |
| Error normalization | try/catch in wrappers → `CommandResult` | Keeps call-sites uniform with rest of `commands.ts` |
| Display name source | Add to `PairingModeInfo` | Already in `SyncServerState`; avoids second round-trip |
| Component location | `features/sync/` | Consistent with `features/chat/` pattern |
