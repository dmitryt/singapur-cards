import { useRemoteThreadListRuntime } from "@assistant-ui/react";
import { useCallback } from "react";
import type { RemoteThreadListAdapter } from "@assistant-ui/core";
import type { ThreadMessage } from "@assistant-ui/core";
import type { CollectionListItem } from "../../lib/tauri/commands";
import { useChatRuntime } from "./useChatRuntime";

export type UseTauriAssistantRuntimeParams = {
  adapter: RemoteThreadListAdapter;
  conversationId: string;
  initialMessages: ThreadMessage[];
  selectedModel: string | null;
  chatSelectedCollectionId: string | null;
  collections: CollectionListItem[];
  onPersistSuccess?: () => void;
};

/**
 * assistant-ui root runtime with Tauri-backed thread list (see
 * https://www.assistant-ui.com/docs/ui/thread-list).
 */
export function useTauriAssistantRuntime({
  adapter,
  conversationId,
  initialMessages,
  selectedModel,
  chatSelectedCollectionId,
  collections,
  onPersistSuccess,
}: UseTauriAssistantRuntimeParams) {
  const runtimeHook = useCallback(
    function usePerThreadTauriRuntime() {
      const { runtime } = useChatRuntime({
        conversationId,
        initialMessages,
        selectedModel,
        chatSelectedCollectionId,
        collections,
        onPersistSuccess,
      });
      return runtime;
    },
    [
      conversationId,
      initialMessages,
      selectedModel,
      chatSelectedCollectionId,
      collections,
      onPersistSuccess,
    ],
  );

  return useRemoteThreadListRuntime({ adapter, runtimeHook });
}
