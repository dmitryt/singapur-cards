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

// ── Language types ────────────────────────────────────────────────────────────

export type Language = {
  code: string;
  title: string;
  createdAt: string;
};

export type CreateLanguageInput = {
  code: string;
  title: string;
};

export type UpdateLanguageInput = {
  code: string;
  title: string;
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

// ── Language command wrappers ──────────────────────────────────────────────────

export async function listLanguages(): Promise<CommandResult<Language[]>> {
  return invoke<CommandResult<Language[]>>("list_languages");
}

export async function createLanguage(input: CreateLanguageInput): Promise<CommandResult<Language>> {
  return invoke<CommandResult<Language>>("create_language", { input });
}

export async function updateLanguage(input: UpdateLanguageInput): Promise<CommandResult<Language>> {
  return invoke<CommandResult<Language>>("update_language", { input });
}

export async function deleteLanguage(code: string): Promise<CommandResult<{ deletedCode: string }>> {
  return invoke<CommandResult<{ deletedCode: string }>>("delete_language", { code });
}

export async function listHeadwordsForLanguage(language: string, limit?: number): Promise<CommandResult<string[]>> {
  return invoke<CommandResult<string[]>>("list_headwords_for_language", {
    language,
    limit: limit ?? null,
  });
}

// ── Chat command wrappers ─────────────────────────────────────────────────────

export type SendChatMessageInput = {
  prompt: string;
  model: string;
  provider: string;
  conversationId: string;
  selectedCollectionId: string | null;
  /** Correlates `chat_stream_*` events from the backend with this request. */
  streamId: string;
};

export type TokenUsageData = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type SendChatMessageOutput = {
  assistantMessage: string;
  tokenUsage: TokenUsageData | null;
  userMessageId: string;
  assistantMessageId: string;
};

export type CreateChatConversationInput = {
  model?: string | null;
  collectionId?: string | null;
};

export type CreateChatConversationOutput = {
  id: string;
};

export type DeleteChatConversationOutput = {
  deletedConversationId: string;
};

export type ChatConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  model: string | null;
  collectionId: string | null;
};

export type ChatMessageDto = {
  id: string;
  role: string;
  body: string;
  metadataJson: string | null;
  createdAt: string;
};

export type ChatCommandFailure = {
  ok: false;
  code:
    | "INVALID_INPUT"
    | "NOT_FOUND"
    | "KEY_REQUIRED"
    | "UNEXPECTED_ERROR"
    | "SECRET_STORE_READ_FAILED"
    | "CANCELLED";
  message: string;
};

export type SendChatMessageResult = CommandSuccess<SendChatMessageOutput> | ChatCommandFailure;

export async function sendChatMessage(
  input: SendChatMessageInput
): Promise<SendChatMessageResult> {
  return invoke<SendChatMessageResult>("send_chat_message", { input });
}

export async function cancelChatStream(streamId: string): Promise<void> {
  return invoke<void>("cancel_chat_stream", { streamId });
}

export async function createChatConversation(
  input: CreateChatConversationInput
): Promise<CommandResult<CreateChatConversationOutput>> {
  return invoke<CommandResult<CreateChatConversationOutput>>("create_chat_conversation", {
    input,
  });
}

export async function listChatConversations(): Promise<CommandResult<ChatConversationSummary[]>> {
  return invoke<CommandResult<ChatConversationSummary[]>>("list_chat_conversations");
}

export async function getChatMessages(
  conversationId: string
): Promise<CommandResult<ChatMessageDto[]>> {
  return invoke<CommandResult<ChatMessageDto[]>>("get_chat_messages", {
    input: { conversationId },
  });
}

export async function deleteChatConversation(
  conversationId: string
): Promise<CommandResult<DeleteChatConversationOutput>> {
  return invoke<CommandResult<DeleteChatConversationOutput>>("delete_chat_conversation", {
    input: { conversationId },
  });
}

// ── Custom model command wrappers ─────────────────────────────────────────────

export type SavedModelItem = {
  name: string;
  title: string;
  provider: string;
};

export type AddCustomModelInput = {
  name: string;
  title: string;
  provider: string;
};

export async function listCustomModels(): Promise<CommandResult<SavedModelItem[]>> {
  return invoke<CommandResult<SavedModelItem[]>>("list_custom_models");
}

export async function addCustomModel(
  input: AddCustomModelInput
): Promise<CommandResult<SavedModelItem>> {
  return invoke<CommandResult<SavedModelItem>>("add_custom_model", { input });
}

export async function deleteCustomModel(
  name: string
): Promise<CommandResult<{ ok: boolean }>> {
  return invoke<CommandResult<{ ok: boolean }>>("delete_custom_model", { input: { name } });
}

// ── Sync types ────────────────────────────────────────────────────────────────

export type PairingModeInfo = {
  host: string;
  port: number;
  code: string;
  expiresAt: string;
  displayName: string;
};

export type PairedDevice = {
  id: string;
  displayName: string;
  pairedAt: string | null;
  lastSyncAt: string | null;
};

// ── Sync command wrappers ─────────────────────────────────────────────────────

export async function syncStartPairing(): Promise<CommandResult<PairingModeInfo>> {
  try {
    const data = await invoke<PairingModeInfo>("sync_start_pairing");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, code: "UNEXPECTED_ERROR", message: String(e) };
  }
}

export async function syncGetPairedDevices(): Promise<CommandResult<PairedDevice[]>> {
  try {
    const data = await invoke<PairedDevice[]>("sync_get_paired_devices");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, code: "UNEXPECTED_ERROR", message: String(e) };
  }
}

export async function syncForgetDevice(deviceId: string): Promise<CommandResult<void>> {
  try {
    await invoke<void>("sync_forget_device", { deviceId });
    return { ok: true, data: undefined };
  } catch (e) {
    return { ok: false, code: "UNEXPECTED_ERROR", message: String(e) };
  }
}

// ── Credential command wrappers ───────────────────────────────────────────────

export type SaveApiCredentialInput = {
  provider: string;
  label?: string;
  apiKey: string;
};

export type SaveApiCredentialOutput = {
  credentialId: string;
  provider: string;
  maskedKey: string;
};

export type GetApiCredentialOutput = {
  exists: boolean;
  maskedKey: string | null;
  label: string | null;
};

export type ApiKeyCommandFailure = {
  ok: false;
  code: "INVALID_INPUT" | "SECRET_STORE_UNAVAILABLE" | "SECRET_STORE_WRITE_FAILED" | "SECRET_STORE_READ_FAILED" | "SECRET_STORE_DELETE_FAILED" | "UNEXPECTED_ERROR";
  message: string;
};

export async function saveApiCredential(
  input: SaveApiCredentialInput
): Promise<CommandSuccess<SaveApiCredentialOutput> | ApiKeyCommandFailure> {
  return invoke("save_api_credential", { input });
}

export async function getApiCredential(
  provider: string
): Promise<CommandSuccess<GetApiCredentialOutput> | ApiKeyCommandFailure> {
  return invoke("get_api_credential", { input: { provider } });
}

export async function deleteApiCredential(
  provider: string
): Promise<CommandSuccess<{ ok: boolean }> | ApiKeyCommandFailure> {
  return invoke("delete_api_credential", { input: { provider } });
}
