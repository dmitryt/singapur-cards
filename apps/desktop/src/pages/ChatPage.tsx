import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";
import { useStore } from "../store";
import { useChatRuntime } from "../features/chat/useChatRuntime";
import { ChatComposer } from "../components/molecules";
import AssistantMessage from "../components/organisms/AssistantMessage";

// ── Layout ────────────────────────────────────────────────────────────────────

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.background};
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
  border-radius: 12px 12px 2px 12px;
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

// ── ChatPage ──────────────────────────────────────────────────────────────────

function ChatPage() {
  const location = useLocation();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const { collections, apiKeyExists, loadCollections, loadApiKeyStatus } = useStore();

  const { runtime, errorMessage } = useChatRuntime({
    selectedModel,
    chatSelectedCollectionId: selectedCollectionId,
    collections,
  });

  useEffect(() => {
    loadCollections();
    loadApiKeyStatus();
  }, [loadCollections, loadApiKeyStatus, location.key]);

  const isConfigured = !!selectedModel && apiKeyExists;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <PageWrapper>
        {errorMessage && (
          <ErrorBanner data-testid="error-banner">{errorMessage}</ErrorBanner>
        )}

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
            selectedModel={selectedModel}
            selectedCollectionId={selectedCollectionId}
            collections={collections}
            apiKeyExists={apiKeyExists}
            sendDisabled={!isConfigured}
            onModelChange={setSelectedModel}
            onCollectionChange={setSelectedCollectionId}
          />
        </ThreadPrimitive.Root>
      </PageWrapper>
    </AssistantRuntimeProvider>
  );
}

export default ChatPage;
