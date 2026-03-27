import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { Button } from "semantic-ui-react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";
import { useStore } from "../store";
import {
  useChatRuntime,
  threadMessagesFromDto,
} from "../features/chat/useChatRuntime";
import { ChatComposer } from "../components/molecules";
import AssistantMessage from "../components/organisms/AssistantMessage";
import {
  createChatConversation,
  listChatConversations,
  getChatMessages,
  type ChatConversationSummary,
} from "../lib/tauri/commands";
import type { ThreadMessage } from "@assistant-ui/core";

// ── Layout ────────────────────────────────────────────────────────────────────

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

const ConversationSidebar = styled.aside`
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.md};
  gap: ${({ theme }) => theme.spacing.sm};
`;

const SidebarHeading = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const ConversationList = styled.div`
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const ConversationRow = styled.button<{ $active: boolean }>`
  appearance: none;
  font: inherit;
  width: 100%;
  text-align: left;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : "transparent")};
  background: ${({ $active }) =>
    $active ? "rgba(33, 133, 208, 0.08)" : "transparent"};
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${({ $active }) =>
      $active ? "rgba(33, 133, 208, 0.1)" : "rgba(0,0,0,0.04)"};
  }
`;

const ConversationTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ConversationMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const MainColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
`;

const ThreadViewport = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const UserMessageBubble = styled.div`
  align-self: flex-end;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  max-width: 70%;
  word-break: break-word;
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

const SetupGuidance = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.875rem;
  margin: auto 0;
`;

const CenteredStatus = styled.p`
  margin: auto;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// ── User message component ────────────────────────────────────────────────────

function UserMessage() {
  return (
    <MessagePrimitive.Root>
      <UserMessageBubble>
        <MessagePrimitive.Content />
      </UserMessageBubble>
    </MessagePrimitive.Root>
  );
}

function formatConversationTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ── ChatPage ──────────────────────────────────────────────────────────────────

function ChatPage() {
  const location = useLocation();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadedMessages, setLoadedMessages] = useState<ThreadMessage[]>([]);

  const { collections, apiKeyExists, loadCollections, loadApiKeyStatus } = useStore();

  const refreshConversations = useCallback(async () => {
    const r = await listChatConversations();
    if (r.ok) setConversations(r.data);
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
          <ConversationSidebar>
            <SidebarHeading>Conversations</SidebarHeading>
            <Button
              fluid
              basic
              size="small"
              type="button"
              data-testid="new-chat-button"
              onClick={() => void handleNewChat()}
            >
              New chat
            </Button>
            <ConversationList>
              {conversations.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  type="button"
                  $active={conv.id === activeConversationId}
                  data-testid={`conversation-row-${conv.id}`}
                  onClick={() => selectConversation(conv)}
                >
                  <ConversationTitle>{conv.title}</ConversationTitle>
                  <ConversationMeta>{formatConversationTime(conv.updatedAt)}</ConversationMeta>
                </ConversationRow>
              ))}
            </ConversationList>
          </ConversationSidebar>

          <MainColumn>
            <ThreadPrimitive.Root>
              <ThreadViewport>
                {!isConfigured && (
                  <SetupGuidance data-testid="setup-guidance">
                    Select a model and add your API key in Profile to start chatting.
                  </SetupGuidance>
                )}
                <ThreadPrimitive.Viewport>
                  <ThreadPrimitive.Messages
                    components={{
                      UserMessage,
                      AssistantMessage,
                    }}
                  />
                </ThreadPrimitive.Viewport>
              </ThreadViewport>

              <ChatComposer
                key={activeConversationId}
                selectedModel={selectedModel}
                selectedCollectionId={selectedCollectionId}
                collections={collections}
                apiKeyExists={apiKeyExists}
                sendDisabled={!isConfigured}
                onModelChange={setSelectedModel}
                onCollectionChange={setSelectedCollectionId}
              />
            </ThreadPrimitive.Root>
          </MainColumn>
        </HubRow>
      </PageWrapper>
    </AssistantRuntimeProvider>
  );
}

export default ChatPage;
