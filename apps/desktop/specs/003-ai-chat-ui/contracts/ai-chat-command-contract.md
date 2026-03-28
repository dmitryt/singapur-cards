# Contract: AI Chat Tauri Command

## Scope

Defines the frontend <-> Tauri command contract for v1 chat completions.

## Command

- **Name**: `send_chat_message`
- **Direction**: React frontend invokes Rust command.

## Request Schema

```json
{
  "input": {
    "prompt": "string (required, non-empty)",
    "model": "string (required)",
    "provider": "string (required, e.g. \"openrouter\")",
    "selectedCollectionId": "string | null"
  }
}
```

> In v1, the frontend adapter passes `provider: "openrouter"` as a hardcoded constant. The field exists in the schema so the Rust command can resolve the correct keychain entry via the `ai_credentials` table without requiring provider selection in the UI.

## Success Response Schema

```json
{
  "ok": true,
  "data": {
    "assistantMessage": "string",
    "tokenUsage": {
      "promptTokens": 0,
      "completionTokens": 0,
      "totalTokens": 0
    }
  }
}
```

`tokenUsage` may be `null` when provider does not return token metadata.

## Error Response Schema

```json
{
  "ok": false,
  "code": "INVALID_INPUT | NOT_FOUND | KEY_REQUIRED | UNEXPECTED_ERROR",
  "message": "string"
}
```

Additional provider/network-specific errors should be mapped into existing app-safe error codes and readable messages.

## Behavioral Guarantees

- Command resolves credentials by `provider` in Rust: queries the active `ai_credentials` SQLite row for that provider, then reads the raw key from the OS keychain by credential ID. The raw key is never passed from the frontend.
- If no active credential exists for the requested provider, command returns `KEY_REQUIRED` with a user-safe message. There is no fallback credential in v1.
- Raw key value is never returned to the frontend in any success or error response.
- If `selectedCollectionId` is null, request proceeds without collection context.
- If `selectedCollectionId` is set but collection is empty or unavailable, command returns a recoverable error with code `NOT_FOUND` and a user-safe message. It does NOT silently fall back to no-collection mode.
- `delete_api_credential` is the only supported credential removal path. No implicit cleanup occurs on app exit or uninstall; the OS keychain entry persists until explicitly deleted by the learner via the Profile page clear action.
