# Research: Desktop Sync UI (005)

## Decision 1: How to surface the desktop display name in `PairingModeInfo`

**Decision**: Add a `displayName: string` field to `PairingModeInfo` on the Rust side. The `SyncServerState` already carries `local_display_name` (hardcoded to `"Desktop"` at init in `lib.rs:111`). The `start_pairing` function in `server.rs` has access to the state and simply needs to include it in the returned struct.

**Rationale**: FR-002 requires the pairing view to show the desktop's own display name so the user can verify the identity shown on mobile matches. The field is already in state — it's a 2-line addition to `PairingModeInfo` and `start_pairing()`. No separate Tauri command is needed.

**Alternatives considered**:
- Separate `sync_get_desktop_info` command — unnecessary overhead, two round trips.
- Hard-code "Desktop" in the frontend — fragile if the backend name ever changes.

---

## Decision 2: Component placement and file structure

**Decision**: Create `src/features/sync/DesktopSyncSection.tsx`. Import it into `ProfilePage.tsx` replacing the `// TODO` comment. No new route, no new Redux slice.

**Rationale**: The spec explicitly mandates a section within the existing ProfilePage (FR-001). The `features/` directory already exists for domain-grouped, self-contained components (e.g., `features/chat`). Sync state is transient UI state (countdown, polling, pairing result) — it belongs in local component state, not the global store.

**Alternatives considered**:
- `components/organisms/DesktopSyncSection.tsx` — viable, but `features/` is more appropriate for multi-file domain logic.
- Redux slice — overkill; sync state doesn't need to persist across navigation or be shared with other components.

---

## Decision 3: Error handling for sync commands (Err vs CommandResult)

**Decision**: Wrap all three sync `invoke` calls in try/catch inside the command wrappers in `commands.ts`, returning normalized `CommandResult<T>` objects (`{ ok: true, data }` or `{ ok: false, code: "UNEXPECTED_ERROR", message }`). The Rust commands return `Result<T, String>` — Tauri rejects the Promise on `Err`, so try/catch is required.

**Rationale**: Keeps the frontend call-sites consistent with every other command in `commands.ts`. The component can check `.ok` uniformly and render an error state (covering the "sync server not initialized" edge case from the spec).

**Alternatives considered**:
- Inline try/catch in the component — leaks transport-level concerns into UI code.
- Changing Rust to return `CommandResult<T>` — more invasive backend change not justified for three simple commands.

---

## Decision 4: Polling strategy

**Decision**: Use `setInterval` with a 2-second period stored in a `useRef`. Start polling when pairing mode is entered (after `sync_start_pairing` succeeds). Stop polling on: (a) a new device detected, (b) 60-second countdown reaches 0, (c) component unmount. The device list is fetched immediately after "Forget" (FR-007).

**Rationale**: Matches the clarification answer exactly ("poll every ~2 seconds while pairing code is displayed; stop when code expires or a new device is detected"). A simple `setInterval` in a `useEffect` is the minimal implementation — no polling library needed.

**Alternatives considered**:
- Tauri event subscription — sync server doesn't emit events; it's HTTP-only.
- React Query / SWR — overkill for a single UI section with simple polling requirements.

---

## Decision 5: Countdown implementation

**Decision**: Store `secondsRemaining` in local state, decremented by a separate `setInterval` every 1 second. Initialized from `expiresAt` (ISO string from `PairingModeInfo`) using `Math.ceil((new Date(expiresAt) - Date.now()) / 1000)`.

**Rationale**: The spec requires "Expires in N s" updated every second (FR-003). Deriving from `expiresAt` rather than a counter from 60 avoids drift if the call takes time.

**Alternatives considered**:
- Counting down from 60 on click — ignores actual backend expiry time, could drift.

---

## Resolved Unknowns

| Was unclear | Resolved as |
|---|---|
| Does `PairingModeInfo` include desktop display name? | No — must add `displayName` field to Rust struct |
| How does sync server unavailability propagate? | All three commands return `Err(String)` → invoke throws → catch in wrapper → `{ ok: false }` |
| Test framework? | Vitest + React Testing Library (same as existing tests in `src/test/`) |
| Does "Forget" re-fetch the device list? | Yes — spec FR-007 explicitly says "list refreshes immediately after a device is forgotten" |
