import { useState, useCallback, useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  useExternalStoreRuntime,
  type ExternalStoreAdapter,
} from "@assistant-ui/react";
import type { AppendMessage, ThreadMessage } from "@assistant-ui/core";
import { sendChatMessage, cancelChatStream } from "../../lib/tauri/commands";
import type { CollectionListItem, TokenUsageData, ChatMessageDto } from "../../lib/tauri/commands";
import { ERROR_COPY } from "./constants";

export interface ChatRuntimeParams {
  conversationId: string;
  initialMessages: ThreadMessage[];
  selectedModel: string | null;
  chatSelectedCollectionId: string | null;
  collections: CollectionListItem[];
  onPersistSuccess?: () => void;
}

function extractTextFromAppendMessage(message: AppendMessage): string {
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("");
}

function parseTokenUsageObject(o: Record<string, unknown>): TokenUsageData | null {
  const promptTokens = o.promptTokens;
  const completionTokens = o.completionTokens;
  const totalTokens = o.totalTokens;
  if (
    typeof promptTokens === "number" &&
    typeof completionTokens === "number" &&
    typeof totalTokens === "number"
  ) {
    return { promptTokens, completionTokens, totalTokens };
  }
  return null;
}

/** Reads assistant `metadata_json`: new shape `{ model, tokenUsage? }` or legacy flat token usage. */
function parseAssistantMessageMetadata(json: string | null): {
  tokenUsage: TokenUsageData | null;
  model: string | null;
} {
  if (!json?.trim()) return { tokenUsage: null, model: null };
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const model = typeof o.model === "string" && o.model.trim() ? o.model : null;
    const nested = o.tokenUsage;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return { tokenUsage: parseTokenUsageObject(nested as Record<string, unknown>), model };
    }
    return { tokenUsage: parseTokenUsageObject(o), model };
  } catch {
    return { tokenUsage: null, model: null };
  }
}

export function threadMessagesFromDto(rows: ChatMessageDto[]): ThreadMessage[] {
  return rows.map((row) => {
    const createdAt = new Date(row.createdAt);
    if (row.role === "user") {
      return {
        id: row.id,
        role: "user",
        createdAt,
        content: [{ type: "text", text: row.body }],
        attachments: [],
        metadata: { custom: {} },
      } as ThreadMessage;
    }
    const { tokenUsage, model } = parseAssistantMessageMetadata(row.metadataJson);
    const custom: Record<string, unknown> = {};
    if (tokenUsage) custom.tokenUsage = tokenUsage;
    if (model) custom.model = model;
    return {
      id: row.id,
      role: "assistant",
      createdAt,
      content: [{ type: "text", text: row.body }],
      status: { type: "complete", reason: "stop" },
      metadata: {
        custom,
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
      },
    } as ThreadMessage;
  });
}

function makeUserMessage(id: string, text: string): ThreadMessage {
  return {
    id,
    role: "user",
    createdAt: new Date(),
    content: [{ type: "text", text }],
    attachments: [],
    metadata: { custom: {} },
  } as ThreadMessage;
}

function makeAssistantMessage(
  id: string,
  text: string,
  tokenUsage: TokenUsageData | null,
  model: string
): ThreadMessage {
  const custom: Record<string, unknown> = { model };
  if (tokenUsage) custom.tokenUsage = tokenUsage;
  return {
    id,
    role: "assistant",
    createdAt: new Date(),
    content: [{ type: "text", text }],
    status: { type: "complete", reason: "stop" },
    metadata: {
      custom,
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
    },
  } as ThreadMessage;
}

function makeAssistantMessageRunning(id: string, model: string): ThreadMessage {
  const custom: Record<string, unknown> = { model };
  return {
    id,
    role: "assistant",
    createdAt: new Date(),
    content: [{ type: "text", text: "" }],
    status: { type: "running" },
    metadata: {
      custom,
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
    },
  } as ThreadMessage;
}

function assistantTextFromMessage(m: ThreadMessage): string {
  if (m.role !== "assistant") return "";
  return m.content
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("");
}

let _messageIdCounter = 0;
function nextId(): string {
  return `msg-${++_messageIdCounter}-${Date.now()}`;
}

type ChatStreamChunkPayload = {
  streamId?: string;
  delta?: string;
};

export function useChatRuntime({
  conversationId,
  initialMessages,
  selectedModel,
  chatSelectedCollectionId,
  collections,
  onPersistSuccess,
}: ChatRuntimeParams) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeStreamIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMessages([...initialMessages]);
  }, [conversationId, initialMessages]);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const onCancel = useCallback(async () => {
    const id = activeStreamIdRef.current;
    if (!id) return;
    try {
      await cancelChatStream(id);
    } catch {
      // Best-effort cancel; stream may already have finished.
    }
  }, []);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      if (!conversationId.trim()) {
        return;
      }

      if (!selectedModel) {
        setErrorMessage(ERROR_COPY.NO_MODEL_SELECTED);
        return;
      }

      const prompt = extractTextFromAppendMessage(message);
      if (!prompt.trim()) return;

      if (chatSelectedCollectionId) {
        const found = collections.find((c) => c.id === chatSelectedCollectionId);
        if (!found) {
          setErrorMessage(ERROR_COPY.NOT_FOUND);
          return;
        }
      }

      const userMsgId = nextId();
      const assistantMsgId = nextId();
      setMessages((prev) => [
        ...prev,
        makeUserMessage(userMsgId, prompt),
        makeAssistantMessageRunning(assistantMsgId, selectedModel),
      ]);
      setErrorMessage(null);
      setIsRunning(true);

      const streamId = crypto.randomUUID();
      activeStreamIdRef.current = streamId;

      let unlistenChunk: UnlistenFn | undefined;
      try {
        unlistenChunk = await listen<ChatStreamChunkPayload>("chat_stream_chunk", (event) => {
          const p = event.payload;
          if (!p || p.streamId !== streamId || typeof p.delta !== "string" || !p.delta) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantMsgId || m.role !== "assistant") return m;
              const nextText = assistantTextFromMessage(m) + p.delta;
              return {
                ...m,
                content: [{ type: "text", text: nextText }],
              } as ThreadMessage;
            })
          );
        });

        const result = await sendChatMessage({
          prompt,
          model: selectedModel,
          provider: "openrouter",
          conversationId,
          selectedCollectionId: chatSelectedCollectionId,
          streamId,
        });

        if (!result.ok) {
          if (result.code === "CANCELLED") {
            setMessages((prev) => prev.filter((m) => m.id !== userMsgId && m.id !== assistantMsgId));
            return;
          }
          const errorMsg =
            result.code === "KEY_REQUIRED" ? ERROR_COPY.KEY_REQUIRED :
            result.code === "NOT_FOUND" ? ERROR_COPY.NOT_FOUND :
            result.code === "INVALID_INPUT" ? ERROR_COPY.INVALID_INPUT :
            ERROR_COPY.UNEXPECTED_ERROR;
          setErrorMessage(errorMsg);
          setMessages((prev) => prev.filter((m) => m.id !== userMsgId && m.id !== assistantMsgId));
          return;
        }

        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== userMsgId && m.id !== assistantMsgId);
          return [
            ...withoutTemp,
            makeUserMessage(result.data.userMessageId, prompt),
            makeAssistantMessage(
              result.data.assistantMessageId,
              result.data.assistantMessage,
              result.data.tokenUsage,
              selectedModel
            ),
          ];
        });
        onPersistSuccess?.();
      } catch {
        setErrorMessage(ERROR_COPY.UNEXPECTED_ERROR);
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId && m.id !== assistantMsgId));
      } finally {
        unlistenChunk?.();
        activeStreamIdRef.current = null;
        setIsRunning(false);
      }
    },
    [
      selectedModel,
      chatSelectedCollectionId,
      collections,
      conversationId,
      onPersistSuccess,
    ]
  );

  const adapter: ExternalStoreAdapter<ThreadMessage> = {
    messages,
    setMessages: (msgs) => setMessages([...msgs]),
    isRunning,
    onNew,
    onCancel,
  };

  const runtime = useExternalStoreRuntime(adapter);
  return { runtime, errorMessage, clearError };
}
