import { useState, useCallback, useEffect } from "react";
import {
  useExternalStoreRuntime,
  type ExternalStoreAdapter,
} from "@assistant-ui/react";
import type { AppendMessage, ThreadMessage } from "@assistant-ui/core";
import { sendChatMessage } from "../../lib/tauri/commands";
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

function parseTokenUsageFromMetadata(json: string | null): TokenUsageData | null {
  if (!json?.trim()) return null;
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
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
  } catch {
    return null;
  }
  return null;
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
    const tokenUsage = parseTokenUsageFromMetadata(row.metadataJson);
    return {
      id: row.id,
      role: "assistant",
      createdAt,
      content: [{ type: "text", text: row.body }],
      status: { type: "complete", reason: "stop" },
      metadata: {
        custom: tokenUsage ? { tokenUsage } : {},
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

function makeAssistantMessage(id: string, text: string, tokenUsage: TokenUsageData | null): ThreadMessage {
  return {
    id,
    role: "assistant",
    createdAt: new Date(),
    content: [{ type: "text", text }],
    status: { type: "complete", reason: "stop" },
    metadata: {
      custom: tokenUsage ? { tokenUsage } : {},
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
    },
  } as ThreadMessage;
}

let _messageIdCounter = 0;
function nextId(): string {
  return `msg-${++_messageIdCounter}-${Date.now()}`;
}

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

  useEffect(() => {
    setMessages([...initialMessages]);
  }, [conversationId, initialMessages]);

  const clearError = useCallback(() => setErrorMessage(null), []);

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
      setMessages((prev) => [...prev, makeUserMessage(userMsgId, prompt)]);
      setErrorMessage(null);
      setIsRunning(true);

      try {
        const result = await sendChatMessage({
          prompt,
          model: selectedModel,
          provider: "openrouter",
          conversationId,
          selectedCollectionId: chatSelectedCollectionId,
        });

        if (!result.ok) {
          const errorMsg =
            result.code === "KEY_REQUIRED" ? ERROR_COPY.KEY_REQUIRED :
            result.code === "NOT_FOUND" ? ERROR_COPY.NOT_FOUND :
            result.code === "INVALID_INPUT" ? ERROR_COPY.INVALID_INPUT :
            ERROR_COPY.UNEXPECTED_ERROR;
          setErrorMessage(errorMsg);
          setMessages((prev) => prev.filter((m) => m.id !== userMsgId));
          return;
        }

        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== userMsgId);
          return [
            ...withoutTemp,
            makeUserMessage(result.data.userMessageId, prompt),
            makeAssistantMessage(
              result.data.assistantMessageId,
              result.data.assistantMessage,
              result.data.tokenUsage
            ),
          ];
        });
        onPersistSuccess?.();
      } catch {
        setErrorMessage(ERROR_COPY.UNEXPECTED_ERROR);
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId));
      } finally {
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
  };

  const runtime = useExternalStoreRuntime(adapter);
  return { runtime, errorMessage, clearError };
}
