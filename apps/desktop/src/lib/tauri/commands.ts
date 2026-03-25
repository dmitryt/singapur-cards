import { invoke, Channel } from "@tauri-apps/api/core";

// ── Shared result types ───────────────────────────────────────────────────────

export type CommandSuccess<T> = {
  ok: true;
  data: T;
};

export type CommandFailure = {
  ok: false;
  code:
    | "INVALID_INPUT"
    | "FILE_READ_FAILED"
    | "PARSE_FAILED"
    | "NOT_FOUND"
    | "CONFLICT"
    | "PERSISTENCE_FAILED"
    | "UNEXPECTED_ERROR";
  message: string;
};

export type ConflictFailure = {
  ok: false;
  code: "CONFLICT";
  message: string;
  existingCardId: string;
};

export type CommandResult<T> = CommandSuccess<T> | CommandFailure;

// ── Import progress ───────────────────────────────────────────────────────────

export type ImportProgressEvent = {
  processedEntries: number;
  totalEstimate?: number;
  phase: "scanning" | "indexing" | "finalizing";
};

// ── Dictionary types ──────────────────────────────────────────────────────────

export type ImportDictionaryInput = {
  filePath: string;
  displayName?: string;
  languageFrom: string;
  languageTo: string;
};

export type ImportDictionaryOutput = {
  dictionaryId: string;
  name: string;
  languageFrom: string;
  languageTo: string;
  importStatus: "queued" | "importing" | "ready" | "failed";
  entryCount: number;
  skippedEntryCount: number;
  warnings?: string;
};

export type DictionaryListItem = {
  id: string;
  name: string;
  languageFrom: string;
  languageTo: string;
  importStatus: "queued" | "importing" | "ready" | "failed";
  entryCount: number;
};

export type SearchHeadwordsInput = {
  query: string;
  searchLanguage?: string;
  dictionaryIds?: string[];
  limit?: number;
};

export type SearchResult = {
  headword: string;
  language: string;
  sourceEntryIds: string[];
  previewText: string;
  matchKind: "exact" | "prefix";
  contributingDictionaryCount: number;
};

export type HeadwordDetailEntry = {
  entryId: string;
  dictionaryId: string;
  languageTo: string;
  dictionaryName: string;
  transcription?: string;
  definitionText: string;
  exampleText?: string;
  audioReference?: string;
};

export type HeadwordDetail = {
  headword: string;
  language: string;
  sourceEntryIds: string[];
  entries: HeadwordDetailEntry[];
};

// ── Card types ────────────────────────────────────────────────────────────────

export type CreateCardInput = {
  headword: string;
  language: string;
  sourceEntryIds: string[];
  overrideAnswerText?: string;
  overrideExampleText?: string;
  notes?: string;
  collectionIds?: string[];
};

export type CreateCardOutput = {
  cardId: string;
  learningStatus: "unreviewed" | "learned" | "not_learned";
};

export type UpdateCardInput = {
  cardId: string;
  language: string;
  headword: string;
  answerText: string;
  exampleText?: string;
  notes?: string;
  audioReference?: string;
  sourceEntryIds?: string[];
  collectionIds?: string[];
};

export type UpdateCardOutput = {
  cardId: string;
  updatedAt: string;
};

export type CardDetail = {
  id: string;
  language: string;
  headword: string;
  answerText: string;
  exampleText?: string;
  notes?: string;
  audioReference?: string;
  sourceEntryIds: string[];
  learningStatus: "unreviewed" | "learned" | "not_learned";
  collectionIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CardListItem = {
  id: string;
  language: string;
  headword: string;
  answerText: string;
  learningStatus: "unreviewed" | "learned" | "not_learned";
  collectionIds: string[];
};

// ── Collection types ──────────────────────────────────────────────────────────

export type CreateCollectionInput = {
  name: string;
  description?: string;
};

export type CreateCollectionOutput = {
  collectionId: string;
  name: string;
};

export type CollectionListItem = {
  id: string;
  name: string;
  description?: string;
  cardCount: number;
};

export type RenameCollectionOutput = {
  collectionId: string;
  name: string;
  updatedAt: string;
};

// ── Review types ──────────────────────────────────────────────────────────────

export type StartReviewSessionOutput = {
  sessionCardIds: string[];
  totalCards: number;
};

export type RecordReviewResultOutput = {
  cardId: string;
  learningStatus: "learned" | "not_learned";
  reviewedAt: string;
};

// ── Command wrappers ──────────────────────────────────────────────────────────

export async function importDictionary(
  input: ImportDictionaryInput,
  onProgress: (event: ImportProgressEvent) => void
): Promise<CommandResult<ImportDictionaryOutput>> {
  const channel = new Channel<ImportProgressEvent>();
  channel.onmessage = onProgress;
  return invoke<CommandResult<ImportDictionaryOutput>>("import_dictionary", {
    input,
    onProgress: channel,
  });
}

export async function listDictionaries(): Promise<CommandResult<DictionaryListItem[]>> {
  return invoke<CommandResult<DictionaryListItem[]>>("list_dictionaries");
}

export async function removeDictionary(dictionaryId: string): Promise<CommandResult<{ removedDictionaryId: string }>> {
  return invoke<CommandResult<{ removedDictionaryId: string }>>("remove_dictionary", {
    dictionaryId,
  });
}

export async function searchHeadwords(input: SearchHeadwordsInput): Promise<CommandResult<SearchResult[]>> {
  return invoke<CommandResult<SearchResult[]>>("search_headwords", { input });
}

export async function getHeadwordDetail(headword: string, language: string): Promise<CommandResult<HeadwordDetail>> {
  return invoke<CommandResult<HeadwordDetail>>("get_headword_detail", {
    input: { headword, language },
  });
}

export async function createCardFromHeadwordDetail(
  input: CreateCardInput
): Promise<CommandResult<CreateCardOutput> | ConflictFailure> {
  return invoke<CommandResult<CreateCardOutput> | ConflictFailure>(
    "create_card_from_headword_detail",
    { input }
  );
}

export async function updateCard(input: UpdateCardInput): Promise<CommandResult<UpdateCardOutput>> {
  return invoke<CommandResult<UpdateCardOutput>>("update_card", { input });
}

export async function getCard(cardId: string): Promise<CommandResult<CardDetail>> {
  return invoke<CommandResult<CardDetail>>("get_card", { cardId });
}

export async function listCards(
  collectionId?: string,
  learningStatus?: "unreviewed" | "learned" | "not_learned"
): Promise<CommandResult<CardListItem[]>> {
  return invoke<CommandResult<CardListItem[]>>("list_cards", {
    collectionId: collectionId ?? null,
    learningStatus: learningStatus ?? null,
  });
}

export async function deleteCard(cardId: string): Promise<CommandResult<{ deletedCardId: string }>> {
  return invoke<CommandResult<{ deletedCardId: string }>>("delete_card", { cardId });
}

export async function createCollection(input: CreateCollectionInput): Promise<CommandResult<CreateCollectionOutput>> {
  return invoke<CommandResult<CreateCollectionOutput>>("create_collection", { input });
}

export async function listCollections(): Promise<CommandResult<CollectionListItem[]>> {
  return invoke<CommandResult<CollectionListItem[]>>("list_collections");
}

export async function renameCollection(collectionId: string, newName: string): Promise<CommandResult<RenameCollectionOutput>> {
  return invoke<CommandResult<RenameCollectionOutput>>("rename_collection", {
    input: { collectionId, newName },
  });
}

export async function deleteCollection(collectionId: string): Promise<CommandResult<{ deletedCollectionId: string }>> {
  return invoke<CommandResult<{ deletedCollectionId: string }>>("delete_collection", {
    collectionId,
  });
}

export async function startReviewSession(collectionId?: string): Promise<CommandResult<StartReviewSessionOutput>> {
  return invoke<CommandResult<StartReviewSessionOutput>>("start_review_session", {
    input: { collectionId: collectionId ?? null },
  });
}

export async function recordReviewResult(
  cardId: string,
  result: "learned" | "not_learned"
): Promise<CommandResult<RecordReviewResultOutput>> {
  return invoke<CommandResult<RecordReviewResultOutput>>("record_review_result", {
    input: { cardId, result },
  });
}
