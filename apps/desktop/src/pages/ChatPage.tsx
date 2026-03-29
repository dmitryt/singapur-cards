import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useStore } from "../store";
import { useChatRuntime, threadMessagesFromDto } from "../features/chat/useChatRuntime";
import {
  createChatConversation,
  listChatConversations,
  getChatMessages,
  deleteChatConversation,
  listCustomModels,
  type ChatConversationSummary,
  type SavedModelItem,
} from "../lib/tauri/commands";
import type { ThreadMessage } from "@assistant-ui/core";
import { ChatConversationSidebar } from "../components/organisms/ChatConversationSidebar";
import { ChatSemanticThreadPanel } from "../components/organisms/ChatSemanticThreadPanel";

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.background};
`;

const HubRow = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
`;

const ErrorBanner = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  margin: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg} 0;
  border-radius: 8px;
  font-size: 0.875rem;
`;

const CenteredStatus = styled.p`
  margin: auto;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

function ChatPage() {
  const location = useLocation();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [customModels, setCustomModels] = useState<SavedModelItem[]>([]);
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadedMessages, setLoadedMessages] = useState<ThreadMessage[]>([]);

  const { collections, apiKeyExists, loadCollections, loadApiKeyStatus } = useStore();

  const refreshConversations = useCallback(async (): Promise<ChatConversationSummary[] | null> => {
    const r = await listChatConversations();
    if (!r.ok) return null;
    setConversations(r.data);
    return r.data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listChatConversations();
      if (cancelled || !list.ok) return;
      setConversations(list.data);
      if (list.data.length === 0) {
        const c = await createChatConversation({});
        if (cancelled || !c.ok) return;
        await refreshConversations();
        if (!cancelled) setActiveConversationId(c.data.id);
      } else if (!cancelled) {
        setActiveConversationId((prev) => {
          if (prev && list.data.some((c) => c.id === prev)) return prev;
          return list.data[0].id;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.key, refreshConversations]);

  useEffect(() => {
    loadCollections();
    loadApiKeyStatus();
  }, [loadCollections, loadApiKeyStatus, location.key]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await listCustomModels();
      if (cancelled) return;
      if (r.ok) {
        setCustomModels(Array.isArray(r.data) ? r.data : []);
      } else {
        setCustomModels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.key]);

  useEffect(() => {
    if (!activeConversationId) return;
    let cancelled = false;
    setLoadedMessages([]);
    (async () => {
      const r = await getChatMessages(activeConversationId);
      if (cancelled || !r.ok) return;
      setLoadedMessages(threadMessagesFromDto(r.data));
    })();
    return () => {
      cancelled = true;
    };
  }, [activeConversationId]);

  const handleNewChat = useCallback(async () => {
    const c = await createChatConversation({
      model: selectedModel ?? undefined,
      collectionId: selectedCollectionId ?? undefined,
    });
    if (!c.ok) return;
    setActiveConversationId(c.data.id);
    setLoadedMessages([]);
    await refreshConversations();
  }, [selectedModel, selectedCollectionId, refreshConversations]);

  const selectConversation = useCallback((conv: ChatConversationSummary) => {
    setActiveConversationId(conv.id);
    setSelectedModel(conv.model ?? null);
    setSelectedCollectionId(conv.collectionId ?? null);
  }, []);

  const handleRemoveConversation = useCallback(
    async (id: string) => {
      const del = await deleteChatConversation(id);
      if (!del.ok) return;

      const list = await refreshConversations();
      if (list === null) return;

      if (id !== activeConversationId) return;

      if (list.length > 0) {
        const next = list[0];
        setActiveConversationId(next.id);
        setSelectedModel(next.model ?? null);
        setSelectedCollectionId(next.collectionId ?? null);
      } else {
        const c = await createChatConversation({});
        if (!c.ok) return;
        setActiveConversationId(c.data.id);
        setLoadedMessages([]);
        await refreshConversations();
      }
    },
    [activeConversationId, refreshConversations],
  );


  const { runtime, errorMessage } = useChatRuntime({
    conversationId: activeConversationId ?? "",
    initialMessages: loadedMessages,
    selectedModel,
    chatSelectedCollectionId: selectedCollectionId,
    collections,
    onPersistSuccess: refreshConversations,
  });

  const isConfigured = !!selectedModel && apiKeyExists;

  if (!activeConversationId) {
    return (
      <PageWrapper>
        <CenteredStatus>Loading conversations…</CenteredStatus>
      </PageWrapper>
    );
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <PageWrapper>
        {errorMessage && (
          <ErrorBanner data-testid="error-banner">{errorMessage}</ErrorBanner>
        )}

        <HubRow>
          <ChatConversationSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onNewChat={handleNewChat}
            onSelectConversation={selectConversation}
            onRemoveConversation={handleRemoveConversation}
          />

          <ChatSemanticThreadPanel
            activeConversationId={activeConversationId}
            isConfigured={isConfigured}
            selectedModel={selectedModel}
            selectedCollectionId={selectedCollectionId}
            collections={collections}
            customModels={customModels}
            apiKeyExists={apiKeyExists}
            onModelChange={setSelectedModel}
            onCollectionChange={setSelectedCollectionId}
          />
        </HubRow>
      </PageWrapper>
    </AssistantRuntimeProvider>
  );
}

export default ChatPage;
