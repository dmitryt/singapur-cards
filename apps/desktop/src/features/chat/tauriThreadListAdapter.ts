import type { RemoteThreadListAdapter, RemoteThreadListResponse, RemoteThreadMetadata } from "@assistant-ui/core";
import type { ThreadMessage } from "@assistant-ui/core";
import type { AssistantStream, AssistantStreamChunk } from "assistant-stream";
import {
  createChatConversation,
  listChatConversations,
  type ChatConversationSummary,
} from "../../lib/tauri/commands";

export type TauriThreadListAdapterOptions = {
  getCreateInput: () => { model?: string | null; collectionId?: string | null };
  /** Called after list() returns and after a new thread is persisted via initialize(). */
  onConversationsSynced?: (rows: ChatConversationSummary[]) => void;
};

function toRemoteMetadata(row: ChatConversationSummary): RemoteThreadMetadata {
  return {
    remoteId: row.id,
    externalId: undefined,
    status: "regular",
    title: row.title,
  };
}

export function createTauriRemoteThreadListAdapter(
  options: TauriThreadListAdapterOptions,
): RemoteThreadListAdapter {
  return {
    async list(): Promise<RemoteThreadListResponse> {
      const r = await listChatConversations();
      if (!r.ok) {
        throw new Error(r.message ?? "Failed to list conversations");
      }
      options.onConversationsSynced?.(r.data);
      return {
        threads: r.data.map(toRemoteMetadata),
      };
    },

    async rename(): Promise<void> {
      /* no Tauri command yet */
    },

    async archive(): Promise<void> {
      /* no Tauri command yet */
    },

    async unarchive(): Promise<void> {
      /* no Tauri command yet */
    },

    async delete(): Promise<void> {
      /* no Tauri command yet */
    },

    async initialize(_threadId: string): Promise<{ remoteId: string; externalId: string | undefined }> {
      const input = options.getCreateInput();
      const c = await createChatConversation({
        model: input.model ?? undefined,
        collectionId: input.collectionId ?? undefined,
      });
      if (!c.ok) {
        throw new Error(c.message ?? "Failed to create conversation");
      }
      const sync = await listChatConversations();
      if (sync.ok) options.onConversationsSynced?.(sync.data);
      return { remoteId: c.data.id, externalId: undefined };
    },

    async generateTitle(
      _remoteId: string,
      _messages: readonly ThreadMessage[],
    ): Promise<AssistantStream> {
      return Promise.resolve(new ReadableStream<AssistantStreamChunk>());
    },

    async fetch(remoteId: string): Promise<RemoteThreadMetadata> {
      const r = await listChatConversations();
      if (!r.ok) {
        throw new Error(r.message ?? "Failed to list conversations");
      }
      const row = r.data.find((x) => x.id === remoteId);
      if (!row) throw new Error("Thread not found");
      return toRemoteMetadata(row);
    },
  };
}
