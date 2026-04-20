### Requirement: Mobile app can pair with a desktop app on the same LAN
The app SHALL allow a user to pair a mobile device with a desktop app that is on the same local network by manually entering the pairing details shown by desktop.

#### Scenario: Pair by manual entry
- **WHEN** the desktop app shows pairing details and the user enters them manually on mobile
- **THEN** the mobile app validates the input and attempts pairing using the advertised desktop host, port, and short-lived pairing code

### Requirement: Pairing establishes a trusted desktop identity
The app SHALL persist the paired desktop's device identity and the credential required for future authenticated sync sessions after pairing completes successfully. The completed pairing credential SHALL be bound to the specific mobile and desktop device identities and SHALL NOT reuse the short-lived pairing token as the long-lived sync credential.

#### Scenario: Successful pairing stores trusted peer
- **WHEN** the mobile app completes pairing with a desktop app
- **THEN** the mobile app stores the desktop device ID, display name, connection details, and trust credential locally

#### Scenario: Future sync does not require re-pairing
- **WHEN** the app already has a trusted desktop stored and the user starts a sync session
- **THEN** the app authenticates the sync request using the stored trust record instead of asking the user to pair again

#### Scenario: Pairing establishes device-bound sync trust
- **WHEN** pairing completes successfully
- **THEN** the resulting long-lived sync credential is bound to the specific mobile and desktop device IDs and cannot be used as a generic bearer credential for unrelated peers

### Requirement: Pairing rejects invalid or expired requests
The app SHALL reject pairing attempts that use expired, malformed, or already-invalidated pairing payloads.

#### Scenario: Expired pairing payload is rejected
- **WHEN** the mobile app receives a pairing payload whose `expiresAt` is in the past
- **THEN** the app does not establish trust and shows an actionable error to the user

#### Scenario: Desktop rejects invalid pairing token
- **WHEN** the mobile app submits a malformed or invalid pairing token to the desktop app
- **THEN** the app reports that pairing failed and does not persist a trusted peer

### Requirement: Future sync requests use freshness and replay protection
The app SHALL require each authenticated sync request to include freshness information such as a request identifier and timestamp or nonce so replayed requests can be rejected.

#### Scenario: Replayed sync request is rejected
- **WHEN** an already-accepted sync request is replayed outside the valid freshness window or with an invalid freshness check
- **THEN** the receiving peer rejects the replayed request and does not apply it again

#### Scenario: Tampered authenticated sync request is rejected
- **WHEN** a sync request fails authentication against the stored long-lived trust credential
- **THEN** the receiving peer rejects the request and no sync changes are applied

### Requirement: User can forget a paired desktop
The app SHALL provide a way to remove the stored trust relationship for a paired desktop.

#### Scenario: Forget paired desktop
- **WHEN** the user chooses to disconnect or forget the paired desktop
- **THEN** the stored trust record is removed and future sync attempts require a new pairing flow
