# Feature Specification: Desktop Sync UI

**Feature Branch**: `005-desktop-sync-ui`
**Created**: 2026-04-11
**Status**: Draft
**Input**: User description: "I want to add sync between desktop and mobile apps. Mobile sync has been described and implemented here ../mobile/openspec/changes/add-lan-device-sync. Some changes were made in desktop app. Go through TODO markers in the code and analyze. Working directory is apps/desktop."

## Clarifications

### Session 2026-04-11

- Q: How does the UI detect that a mobile device has completed pairing? → A: Poll `sync_get_paired_devices` every ~2 seconds while the pairing code is displayed; stop polling when the code expires or a new device is detected.
- Q: Should Desktop Sync live in the existing ProfilePage (Settings) or a new dedicated page? → A: Section within the existing ProfilePage — no new route or nav entry.
- Q: What form should the pairing code expiry indicator take? → A: Live countdown showing remaining seconds (e.g. "Expires in 42 s"), updating each second.
- Q: What confirmation style for "Forget device"? → A: Modal dialog matching the existing `<Confirm>` pattern used for other destructive actions in the app.
- Q: Should the pairing view show the desktop's own display name? → A: Yes — show the desktop display name alongside host:port and code so the user can verify the identity shown on mobile matches.

## Context

The desktop app's sync backend (HTTP server, pairing logic, and pull-push sync handler) is already fully implemented in Rust. The mobile app has its own complete sync implementation. The missing piece is the desktop UI that exposes these capabilities to the user, wiring up three already-registered backend commands into a visible settings section. This spec covers that UI gap only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pair a mobile device with the desktop (Priority: P1)

A user wants to sync their study data between the desktop and mobile apps. They open the Desktop Sync settings on the desktop and start pairing mode. The desktop shows a connection code and address that the user enters on the mobile app (Settings → Desktop Sync → Pair) to establish trust.

**Why this priority**: This is the entry point for all sync functionality. Nothing else works without an initial pairing.

**Independent Test**: Can be fully tested by starting pairing on the desktop, reading the displayed code and host/port, and confirming a paired device appears in the list afterwards.

**Acceptance Scenarios**:

1. **Given** the user is on the Desktop Sync settings section, **When** they click "Start Pairing", **Then** the desktop displays the connection address (host:port) and a 6-digit pairing code, visible for 60 seconds.
2. **Given** the pairing code is displayed, **When** 60 seconds elapse without a mobile pairing attempt, **Then** the code expires and the UI returns to idle with a message indicating the session expired.
3. **Given** a mobile device successfully completes pairing using the displayed code, **Then** the new device appears in the paired devices list with its name and pairing timestamp.

---

### User Story 2 - View and manage paired devices (Priority: P2)

A user wants to see which mobile devices are paired with the desktop and remove any they no longer need.

**Why this priority**: Without device management, the user cannot revoke access from a lost or replaced phone.

**Independent Test**: Can be tested independently of the pairing flow by confirming the list displays existing paired devices with a working Forget action.

**Acceptance Scenarios**:

1. **Given** one or more mobile devices are paired, **When** the user opens the Desktop Sync section, **Then** each paired device is shown with its display name and last-sync timestamp (or "Never synced" if no sync has occurred).
2. **Given** one or more mobile devices are paired, **When** the user views the Desktop Sync section, **Then** pairing actions ("Start Pairing" / "Pair another device") are not shown.
3. **Given** a paired device is listed, **When** the user clicks "Forget" and confirms, **Then** the device is removed from the list and future sync attempts from that device are rejected.
4. **Given** no devices are paired, **When** the user views the Desktop Sync section, **Then** an empty state is shown prompting the user to start pairing.
5. **Given** the user has forgotten the previously paired device and there are now zero paired devices, **When** they view the Desktop Sync section, **Then** the pairing action becomes visible again.
6. **Given** a device was paired and then forgotten on desktop, **When** that mobile device sends the next sync request, **Then** desktop rejects the request with an authentication failure and machine-readable revocation code.
7. **Given** mobile is currently paired, **When** the user unpairs from mobile, **Then** mobile sends an authenticated unpair request to desktop and the desktop device list no longer includes that mobile device.

---

### User Story 3 - Persistent pairing state across restarts (Priority: P3)

After pairing and syncing, reopening the desktop app shows the previously paired devices and the last sync time — the user does not need to re-pair after restarting.

**Why this priority**: Paired device records already persist in the backend database; this story ensures the last-sync timestamp is also surfaced reliably in the UI after restarts.

**Independent Test**: Can be tested by pairing a device, restarting the desktop app, and confirming the paired device is still listed with its last-sync time.

**Acceptance Scenarios**:

1. **Given** a mobile device is paired, **When** the user closes and restarts the desktop app, **Then** the paired device is still listed under Desktop Sync without requiring re-pairing.
2. **Given** a sync session completed at a known time, **When** the user views Desktop Sync after restarting, **Then** the last-sync timestamp for that device is accurately displayed.

---

### Edge Cases

- What happens when the user clicks "Start Pairing" while a pairing session is already active? — The existing session is replaced with a fresh code and 60-second timer.
- What happens when a device is already paired and the user attempts to start a new pairing session from the UI? — The UI does not expose a pairing action until all paired devices are removed.
- What happens on mobile immediately after desktop Forget if mobile has not synced yet? — Mobile remains locally marked as paired until its next sync attempt fails with pairing-revoked auth response.
- What happens if mobile tries to unpair while desktop is unreachable? — Mobile keeps current pairing state and shows an explicit unpair failure; desktop state is unchanged.
- What happens when the pairing code expires before the user finishes entering it on mobile? — The desktop shows an expiry notice and offers a way to start a new session.
- What happens if the sync server failed to start on desktop launch? — The Desktop Sync section displays a clear error state explaining that syncing is unavailable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The desktop app MUST expose a "Desktop Sync" section within the existing ProfilePage (Settings). No new route or sidebar navigation entry is required.
- **FR-002**: The Desktop Sync section MUST provide a "Start Pairing" button that triggers backend pairing mode and displays the desktop's own display name, host:port, and 6-digit code so the user can verify the identity shown on the mobile side matches.
- **FR-003**: The pairing code display MUST include a live countdown showing remaining seconds (e.g. "Expires in 42 s"), updated every second, and MUST auto-dismiss after 60 seconds.
- **FR-004**: The Desktop Sync section MUST display a list of all currently paired mobile devices with each device's name and last-sync timestamp.
- **FR-005**: Each listed paired device MUST have a "Forget" action that removes the trust record after the user confirms via a modal dialog, consistent with the existing destructive-action confirmation pattern in the app.
- **FR-006**: The frontend MUST expose typed wrappers for the three backend commands (`sync_start_pairing`, `sync_get_paired_devices`, `sync_forget_device`) following the existing invoke pattern in `commands.ts`.
- **FR-007**: While the pairing code is displayed, the UI MUST poll `sync_get_paired_devices` approximately every 2 seconds and automatically transition to the paired devices list as soon as a new device is detected. Polling MUST stop when the 60-second window expires or a new device is detected. The list also refreshes immediately after a device is forgotten.
- **FR-008**: When no devices are paired, the section MUST show an empty state with guidance to start pairing.
- **FR-009**: If at least one device is paired, the UI MUST NOT show any pairing action (including "Start Pairing" and "Pair another device").
- **FR-010**: The UI MUST show pairing actions again only when the paired-device list becomes empty (e.g., after forgetting the existing device).
- **FR-011**: After desktop Forget removes a paired device, desktop sync endpoints MUST reject subsequent sync requests from that mobile device with authentication failure.
- **FR-012**: Authentication failures for revoked/unknown mobile devices MUST include a stable machine-readable error code (e.g., `PAIRING_REVOKED`) in addition to HTTP status.
- **FR-013**: Revocation is enforced immediately on desktop, while mobile transitions to unpaired state on its next sync attempt that receives the revocation auth failure (no realtime push required in v1).
- **FR-014**: Desktop MUST expose an authenticated mobile-initiated unpair endpoint (`POST /pairing/forget`) that removes the calling mobile device trust record from desktop.
- **FR-015**: Mobile unpair action MUST be treated as failed if desktop unpair request cannot be delivered/authenticated; in that case mobile MUST keep pairing state and surface an error to the user.

### Key Entities

- **Pairing Session**: A short-lived (60-second) connection invitation identified by a host address, port, and 6-digit code. Single-use; generated on demand.
- **Paired Device**: A trusted mobile device record with a device ID, display name, pairing timestamp, and last-sync timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete the full pairing flow (from clicking "Start Pairing" to seeing the new device in the list) in under 2 minutes on a shared LAN.
- **SC-002**: 100% of paired device records are visible after a desktop app restart — no re-pairing required.
- **SC-003**: Forgetting a device requires a single confirmation step and the device disappears from the list immediately.
- **SC-004**: The pairing code display is self-explanatory without additional documentation for a user who has already set up the mobile side.
