import { useState, useCallback } from "react";
import {
  useExternalStoreRuntime,
  type ExternalStoreAdapter,
} from "@assistant-ui/react";
import type { AppendMessage, ThreadMessage } from "@assistant-ui/core";
import { sendChatMessage } from "../../lib/tauri/commands";
import type { CollectionListItem, TokenUsageData } from "../../lib/tauri/commands";
import { ERROR_COPY } from "./constants";

export interface ChatRuntimeParams {
  selectedModel: string | null;
  chatSelectedCollectionId: string | null;
  collections: CollectionListItem[];
}

function extractTextFromAppendMessage(message: AppendMessage): string {
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("");
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

export function useChatRuntime({ selectedModel, chatSelectedCollectionId, collections }: ChatRuntimeParams) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const onNew = useCallback(
    async (message: AppendMessage) => {
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

        const assistantMsgId = nextId();
        setMessages((prev) => [
          ...prev,
          makeAssistantMessage(assistantMsgId, result.data.assistantMessage, result.data.tokenUsage),
        ]);
      } catch {
        setErrorMessage(ERROR_COPY.UNEXPECTED_ERROR);
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId));
      } finally {
        setIsRunning(false);
      }
    },
    [selectedModel, chatSelectedCollectionId, collections]
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
