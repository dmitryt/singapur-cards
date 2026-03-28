# Data Model: AI Chat for Vocabulary Practice

## 1) ChatSession

- **Purpose**: Represents one active v1 chat context in memory.
- **Fields**:
  - `id`: string
  - `messages`: `ChatMessage[]`
  - `selectedModel`: string
  - `selectedCollectionId`: string | null
  - `status`: `"idle" | "sending" | "error"`
  - `lastErrorMessage`: string | null
- **Validation Rules**:
  - `selectedModel` must be non-empty before send.
  - `selectedCollectionId` may be null for no-collection mode.
- **State Transitions**:
  - `idle -> sending` on prompt submit
  - `sending -> idle` on success
  - `sending -> error` on failure
  - `error -> sending` on next submit

## 2) ChatMessage

- **Purpose**: Represents one user or assistant message.
- **Fields**:
  - `id`: string
  - `role`: `"user" | "assistant"`
  - `content`: string
  - `createdAt`: string (ISO timestamp)
  - `tokenUsage`: `TokenUsage | null` (assistant messages only, nullable)
- **Validation Rules**:
  - `content` must be non-empty after trim.
  - `tokenUsage` is optional and only relevant for assistant messages.

## 3) TokenUsage

- **Purpose**: Usage metadata displayed per assistant response.
- **Fields**:
  - `promptTokens`: number
  - `completionTokens`: number
  - `totalTokens`: number
- **Validation Rules**:
  - All values must be non-negative integers.
  - `totalTokens` should be greater than or equal to both component values.

## 4) CredentialSource

- **Purpose**: Internal resolution metadata for selected API credential.
- **Fields**:
  - `kind`: `"user_key" | "fallback_key"`
- **Validation Rules**:
  - Never expose actual key values to UI state.
  - `kind` is optional for telemetry/debug but not required in UI rendering.

## 5) ChatRequest

- **Purpose**: Input payload crossing frontend->Tauri boundary.
- **Fields**:
  - `prompt`: string
  - `model`: string
  - `selectedCollectionId`: string | null
  - `userApiKey`: string | null
- **Validation Rules**:
  - `prompt` must not be empty/whitespace.
  - `model` must be one of available model options.

## 6) ChatResponse

- **Purpose**: Output payload from Tauri command to frontend.
- **Fields**:
  - `assistantMessage`: string
  - `tokenUsage`: `TokenUsage | null`
  - `resolvedCredentialKind`: `"user_key" | "fallback_key"` (optional to include in non-production logs only)
- **Validation Rules**:
  - `assistantMessage` must be non-empty on success.
  - `tokenUsage` may be null if provider omits usage metadata.

## Relationships

- One `ChatSession` has many `ChatMessage`.
- `ChatSession.selectedCollectionId` references existing collection records (or null).
- `ChatResponse.tokenUsage` is attached to the corresponding assistant `ChatMessage`.
