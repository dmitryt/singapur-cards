# Core Flows

## Import -> Search -> Save Card

1. User chooses DSL file and language pair.
2. Frontend invokes `import_dictionary` with progress channel.
3. Rust parser indexes valid entries and writes to SQLite.
4. User searches headwords scoped by active language.
5. User opens `HeadwordDetail` and creates card.
6. Backend enforces dedupe on `headword + language`.

## Review Session

1. User starts review for all cards or selected collection.
2. Frontend calls `start_review_session`.
3. Backend returns ordered IDs: unreviewed, not learned, learned.
4. User flips card and records result with `record_review_result`.
5. Learning status persists for future sessions.

## Language Management + Global Search

1. User manages languages in `/languages` via CRUD commands.
2. User picks active language in `/profile`.
3. Shared content layout renders search bar across content pages.
4. Search queries call `list_headwords_for_language` or equivalent scoped command path.

## AI Chat Send

1. User saves API key in Profile.
2. Frontend confirms credential exists and model is selected.
3. Frontend invokes `send_chat_message` with prompt/model/provider/context.
4. Rust resolves active provider credential from SQLite + keychain.
5. Rust calls OpenRouter and returns assistant text plus optional usage.
6. Frontend appends response and usage or shows recoverable error.

## Custom Model Lifecycle

1. User opens Models page and selects provider.
2. User adds model (`name`, `title`) and save triggers validation.
3. Storage updates and list refreshes in alphabetical title order.
4. User deletes model; if active model removed, fallback selection is applied.
