# Tasks: Desktop Sync UI

**Input**: Design documents from `apps/desktop/specs/005-desktop-sync-ui/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/tauri-commands.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on pending tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Backend patch + typed command wrappers. No user story work can begin until T001–T005 are done.

**⚠️ CRITICAL**: US1, US2, and US3 all depend on the command wrappers (T003–T004) and the component skeleton (T005).

- [x] T001 [P] Add `display_name: String` field (serde rename `displayName`) to `PairingModeInfo` struct in `src-tauri/src/sync/types.rs`
- [x] T002 [P] Populate `display_name` from `state.local_display_name.clone()` inside `start_pairing()` in `src-tauri/src/sync/server.rs`
- [x] T003 Add `PairingModeInfo` and `PairedDevice` TypeScript types to `src/lib/tauri/commands.ts` (see `contracts/tauri-commands.md` for field shapes)
- [x] T004 Add `syncStartPairing`, `syncGetPairedDevices`, `syncForgetDevice` wrappers with try/catch error normalization to `src/lib/tauri/commands.ts` (after T003)
- [x] T005 Create `src/features/sync/DesktopSyncSection.tsx` with `SyncView` union type (`idle | pairing | paired | error`, where `idle` carries an optional `expiredNotice: boolean` flag) and bare component shell; implement on-mount `useEffect` that calls `syncGetPairedDevices()` and sets initial view to `paired` (≥1 device), `idle` (0 devices), or `error` (command fails) — **this init logic is prerequisite for all three user stories**

**Checkpoint**: Rust builds, TS compiles — user story implementation can now begin.

---

## Phase 2: User Story 1 — Pair a Mobile Device (Priority: P1) 🎯 MVP

**Goal**: User clicks "Start Pairing", sees desktop name + host:port + code for 60 s, and a new device appears in the list automatically when pairing completes.

**Independent Test**: Run desktop app → open ProfilePage → click "Start Pairing" → confirm code display with countdown → confirm new device appears in list after mobile pairs (or confirm expiry notice after 60 s with no action).

- [x] T006 [US1] Implement idle view in `src/features/sync/DesktopSyncSection.tsx`: render a "Start Pairing" button; on click, **if already in `pairing` state clear both existing intervals before proceeding**; call `syncStartPairing()` and transition to `pairing` on success; if `idle.expiredNotice` is true render "Session expired. Start a new pairing session." above the button; render error state on command failure
- [x] T007 [US1] Implement pairing view in `src/features/sync/DesktopSyncSection.tsx`: display `desktopDisplayName`, `host:port` (formatted as `192.168.x.x:PORT`), and the 6-digit `code` using styled-components consistent with existing `ProfilePage` patterns
- [x] T008 [US1] Implement 1s countdown interval in `src/features/sync/DesktopSyncSection.tsx`: derive `secondsRemaining` from `expiresAt` ISO string; render "Expires in N s"; when countdown reaches 0, clear both intervals and transition to `{ kind: "idle", expiredNotice: true }` so T006's idle view renders the expiry notice (covers EC2)
- [x] T009 [US1] Implement 2s polling interval in `src/features/sync/DesktopSyncSection.tsx`: call `syncGetPairedDevices` every 2 s while in `pairing` state; compare against pre-pairing device count; transition to `paired` and clear all intervals when a new device is detected; clear intervals on component unmount
- [x] T010 [P] [US1] Import and render `<DesktopSyncSection />` in `src/pages/ProfilePage.tsx` replacing the `// TODO: Desktop Sync section` comment block (between Active Language and OpenRouter API Key sections)

**Checkpoint**: User Story 1 is fully functional — pairing flow works end-to-end.

---

## Phase 3: User Story 2 — View and Manage Paired Devices (Priority: P2)

**Goal**: User sees all paired mobile devices with name and last-sync time, and can forget any device after confirmation.

**Independent Test**: With ≥1 device already paired, open ProfilePage → confirm device list shows name and timestamp (or "Never synced") → click Forget → confirm dialog appears → confirm → device disappears from list.

- [x] T011 [US2] Implement paired device list rendering in `src/features/sync/DesktopSyncSection.tsx`: for each `PairedDevice`, display `displayName` and `lastSyncAt` formatted as a human-readable date/time (e.g. `new Date(lastSyncAt).toLocaleString()`) or the string "Never synced" when `null`
- [x] T012 [US2] Implement empty state UI in `src/features/sync/DesktopSyncSection.tsx`: when `paired` state has 0 devices (or `idle` with no prior devices), show a short guidance message prompting the user to start pairing
- [x] T013 [US2] Implement Forget action in `src/features/sync/DesktopSyncSection.tsx`: add a "Forget" button per device row; on click, open a `<Confirm>` dialog (imported from `semantic-ui-react`, consistent with `LibraryPage` pattern) with header "Forget device?" and a red confirm button
- [x] T014 [US2] On Forget confirmation, call `syncForgetDevice(deviceId)` in `src/features/sync/DesktopSyncSection.tsx`; on success, re-call `syncGetPairedDevices` and update view state (`idle` if list is now empty, `paired` otherwise)
- [x] T019 [US2] Enforce single-device pairing UX in `src/features/sync/DesktopSyncSection.tsx`: when `paired` has one or more devices, do not render any pairing action ("Start Pairing" / "Pair Another Device")
- [x] T020 [US2] Ensure pairing action becomes visible again only when paired-device list is empty (idle state after Forget) and update `src/test/DesktopSyncSection.test.tsx` assertions accordingly

**Checkpoint**: User Stories 1 and 2 both work independently — device list and forget flow are functional.

---

## Phase 4: User Story 3 — Persistent State Across Restarts (Priority: P3)

**Goal**: After the desktop app restarts, the previously paired device is still listed with the correct last-sync timestamp — no re-pairing required.

**Independent Test**: Pair a device, restart the desktop app, open ProfilePage → confirm device is still listed with name and last-sync time (or "Never synced" if no sync occurred).

- [x] T015 [US3] Verify that the on-mount load from T005 correctly surfaces post-restart state: open the app after a completed pairing and confirm the device appears in `paired` view with the correct `lastSyncAt` value (or "Never synced"); this story has no new code — it validates that T005 + T011 together satisfy persistence
- [x] T016 [US3] Implement error state rendering in `src/features/sync/DesktopSyncSection.tsx`: show a clear message (e.g. "Desktop sync is unavailable. The sync server may not have started correctly.") when `SyncView` is `error`; keep the rest of ProfilePage functional
- [x] T021 [US3] Add structured auth error response for revoked/unknown devices in sync HTTP handlers (e.g. `PAIRING_REVOKED`) in `src-tauri/src/sync/server.rs`, while preserving HTTP 401 semantics
- [x] T022 [US3] Add backend tests for post-forget sync rejection in `src-tauri/src/sync/server.rs` or `src-tauri/tests/`: after `sync_forget_device`, next pull-push from same mobile must return auth failure with machine-readable revocation code
- [ ] T023 [US3] Document and verify mobile-side handling contract in spec/quickstart notes: on revocation auth failure, mobile clears pairing credentials, transitions to unpaired UI, and stops auto-sync retries until re-pair

**Checkpoint**: All three user stories are independently functional and persist correctly across restarts.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T017 [P] Write Vitest test for `DesktopSyncSection` in `src/test/DesktopSyncSection.test.tsx`: mock `invoke` via `src/test/__mocks__`; cover on-mount idle/paired/error states, Start Pairing transition, countdown expiry returning to idle, and Forget flow removing the device
- [ ] T018 Manually verify all acceptance scenarios from `spec.md` (US1 AC1–3, US2 AC1–6, US3 AC1–2) and the five edge cases (re-pairing replacement behavior, paired-state hides pairing actions, mobile remains paired until next failed sync after desktop forget, expiry notice, sync server error)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. T001 and T002 are parallel (different Rust files). T003 must precede T004 (same TS file, types before wrappers). T005 depends on T003–T004.
- **US1 (Phase 2)**: Depends on Phase 1. T006–T009 are sequential (same component file, building incrementally). T010 is parallel (different file, only needs T005 shell).
- **US2 (Phase 3)**: Depends on Phase 1. T011–T014 are sequential (same component file). Can start in parallel with US1 if a second developer works on the same file after T005 is done.
- **US3 (Phase 4)**: T015 is a verification task (no new code — validates T005 + T011). T016 adds error state rendering; it depends on T005 (shell). Can be done in parallel with US2 after Phase 1.
- **Polish (Phase 5)**: T017 depends on all component work being complete. T018 depends on T017.

### User Story Dependencies

- **US1 (P1)**: Foundational (Phase 1) complete → can start immediately
- **US2 (P2)**: Foundational (Phase 1) complete → can start (US1 not required; device list works independently)
- **US3 (P3)**: Foundational (Phase 1) complete → can start (on-mount load doesn't depend on pairing flow)

### Parallel Opportunities

| When | What can run in parallel |
|---|---|
| Phase 1 start | T001 (Rust types.rs) ∥ T002 (Rust server.rs) |
| Phase 1 → Phase 2 transition | T010 (ProfilePage wire-up) ∥ T006–T009 (component states) |
| After Phase 1 with 2 devs | US1 implementation ∥ US3 error state (T016) |
| After all phases | T017 (test file) ∥ other cleanup |

---

## Parallel Example: Phase 1

```
Dev A: T001 — add displayName field to PairingModeInfo in types.rs
Dev B: T002 — populate display_name in start_pairing() in server.rs

(both finish) → Dev A: T003 → T004 → T005
```

## Parallel Example: US1 + Wire-up

```
Dev A: T006 → T007 → T008 → T009  (component states, sequential)
Dev B: T010  (ProfilePage import, independent — only needs T005 shell)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational
2. Complete Phase 2: User Story 1 (T006–T010)
3. **STOP and VALIDATE**: Can pair a mobile device from desktop
4. Ship if US1 satisfies the release requirement

### Incremental Delivery

1. Phase 1 → Phase 2 (US1): Pairing works — demo-able
2. Phase 3 (US2): Device management works — demo-able
3. Phase 4 (US3): Confirmed persistence across restarts — demo-able
4. Phase 5: Polish — production-ready

---

## Notes

- All `DesktopSyncSection.tsx` tasks are in the same file — they are sequential within each story phase
- `<Confirm>` from `semantic-ui-react` is already used in `LibraryPage.tsx`, `CollectionsPage.tsx`, `LanguagePage.tsx` — follow the same import and usage pattern
- The styled-components `Section`, `Label`, `Button`, `StatusText` from `ProfilePage.tsx` can be reused or imported; avoid duplication
- Cleanup intervals in `useEffect` return functions to prevent memory leaks on unmount
- The `error` state covers the "sync server not initialized" case (all three Tauri commands return a rejected Promise in this case — handled by the try/catch in the wrappers)
