# Core Entities and Types

## Vocabulary Domain

```ts
type Dictionary = {
  id: string
  name: string
  languageFrom: string
  languageTo: string
  importStatus: "queued" | "importing" | "ready" | "failed"
  entryCount: number
}

type DictionaryEntry = {
  id: string
  dictionaryId: string
  headword: string
  normalizedHeadword: string
  definitionText: string
  exampleText?: string
}
```

## Study Domain

```ts
type Card = {
  id: string
  language: string
  headword: string
  answerText: string
  learningStatus: "unreviewed" | "learned" | "not_learned"
  sourceEntryIds: string[]
}

type Collection = {
  id: string
  name: string
  description?: string
}
```

## Language/Search Domain

```ts
type Language = {
  code: string // /^[a-z]{2}$/
  title: string
  createdAt: string
}
```

## AI Domain

```ts
type ChatRequest = {
  prompt: string
  model: string
  provider: string
  selectedCollectionId: string | null
}

type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
```

```ts
type SavedModel = {
  name: string
  title: string
  provider: string
}
```

## Persistence Notes

- `HeadwordDetail` is a computed read model, not a base table.
- Card uniqueness is scoped to `headword + language`.
- AI credential metadata is stored in SQLite; raw key value is keychain-only.
- Full desktop DDL, indexes, FTS, and trigger definitions are documented in [SQL Schemas](./sql-schemas.md).
