# Contract: API Key Storage (v1 — Single Active Credential per Provider)

## Scope

Defines the credential storage model for v1:

- **SQLite**: non-sensitive credential metadata (provider, credential ID, label, active flag, timestamps) — `ai_credentials` table.
- **OS Keychain** (`tauri-plugin-keyring`): raw API key secret only, referenced by `credentialId`.

The schema is designed to be forward-compatible with multi-credential management in a future version. v1 enforces one active credential per provider and exposes only save / get (masked) / delete operations.

This contract is additive to `ai-chat-command-contract.md`.

---

## Storage Model

### SQLite DDL (metadata only — no secrets)

```sql
CREATE TABLE IF NOT EXISTS ai_credentials (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  label TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_credentials_provider_active
  ON ai_credentials(provider)
  WHERE is_active = 1;
```

> `last_used_at` is deferred to a future version.

### Keychain Naming Convention

- **Service**: `com.singapur.cards`
- **Account**: `provider:<provider>:key:<credentialId>`
- **Value**: raw API key string

The keychain account encodes both `provider` and `credentialId` so future multi-provider or multi-key support requires no schema change.

---

## Tauri Commands (v1 scope)

All commands live in `apps/desktop/src-tauri/src/commands/api_key.rs`.

> **Deferred to v2**: `list_api_credentials`, `set_active_api_credential`. These can be added without breaking the current schema.

### `save_api_credential`

Creates or replaces the active credential for the given provider. On overwrite, deletes the previous keychain entry and deactivates the old SQLite row before inserting a new one.

**Request**:
```json
{
  "input": {
    "provider": "openrouter",
    "label": "My key",
    "apiKey": "sk-..."
  }
}
```

**Success**:
```json
{
  "ok": true,
  "data": {
    "credentialId": "uuid",
    "provider": "openrouter",
    "maskedKey": "sk-...••••"
  }
}
```

### `get_api_credential`

Returns existence and masked key for UI display. Never returns the raw key.

**Request**:
```json
{ "input": { "provider": "openrouter" } }
```

**Success (credential present)**:
```json
{
  "ok": true,
  "data": { "exists": true, "maskedKey": "sk-...••••", "label": "My key" }
}
```

**Success (no credential)**:
```json
{
  "ok": true,
  "data": { "exists": false, "maskedKey": null, "label": null }
}
```

### `delete_api_credential`

Removes the keychain secret and deactivates the SQLite row for the given provider. No-ops silently if no active credential exists.

**Request**:
```json
{ "input": { "provider": "openrouter" } }
```

**Success**:
```json
{ "ok": true }
```

---

## Error Codes (api_key commands)

| Code | Scenario |
|------|----------|
| `SECRET_STORE_UNAVAILABLE` | OS keychain is locked or unavailable |
| `SECRET_STORE_WRITE_FAILED` | Write attempt failed (permissions, disk) |
| `SECRET_STORE_READ_FAILED` | Read attempt failed |
| `SECRET_STORE_DELETE_FAILED` | Delete attempt failed |

All messages must be user-safe and never include key contents.

---

## Chat Command Integration

The `send_chat_message` Tauri command resolves the active credential for the requested `provider` internally in Rust: looks up the active SQLite row for that provider, then reads the keychain secret by account name. The raw key is never passed from the frontend.

If no active credential is found, `send_chat_message` returns:

```json
{
  "ok": false,
  "code": "KEY_REQUIRED",
  "message": "No API key is saved. Go to Profile to add your OpenRouter key."
}
```

---

## Security Guarantees

- Raw API key never leaves the OS keychain.
- No plaintext API key in SQLite, logs, Tauri command responses, or frontend store state.
- The only key exposure path is the masked display in the Profile page input field.
- Deletion is explicit only via `delete_api_credential`; no implicit cleanup on app exit or uninstall.
