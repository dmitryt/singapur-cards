import styled from "styled-components";
import { Container } from "semantic-ui-react";
import { ThreadPrimitive } from "@assistant-ui/react";
import type { CollectionListItem, SavedModelItem } from "../../lib/tauri/commands";
import { ChatComposer } from "../molecules";
import {
  AssistantMessage,
  AssistantModelFallbackProvider,
  UserMessage,
} from "./ChatSemanticThreadMessages";

/** Fills main column; thread + composer stack with only the viewport scrolling. */
const ThreadColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
`;

const ThreadPrimitiveRoot = styled(ThreadPrimitive.Root)`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
`;

const ThreadViewport = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ComposerDock = styled.div`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg}
    ${({ theme }) => theme.spacing.md};
`;

const MainColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

export interface ChatSemanticThreadPanelProps {
  activeConversationId: string;
  isConfigured: boolean;
  selectedModel: string | null;
  selectedCollectionId: string | null;
  collections: CollectionListItem[];
  customModels: SavedModelItem[];
  apiKeyExists: boolean;
  onModelChange: (model: string | null) => void;
  onCollectionChange: (collectionId: string | null) => void;
}

export function ChatSemanticThreadPanel({
  activeConversationId,
  isConfigured,
  selectedModel,
  selectedCollectionId,
  collections,
  customModels,
  apiKeyExists,
  onModelChange,
  onCollectionChange,
}: ChatSemanticThreadPanelProps) {
  return (
    <MainColumn>
      <ThreadColumn>
        <AssistantModelFallbackProvider fallbackModelId={selectedModel}>
        <ThreadPrimitiveRoot>
          <ThreadViewport>
            <ThreadPrimitive.Messages>
              {({ message }) => {
                return message.role === "user" ? (
                  <Container textAlign="right">
                    <UserMessage />
                  </Container>
                ) : (
                  <Container>
                    <AssistantMessage />
                  </Container>
                );
              }}
            </ThreadPrimitive.Messages>
          </ThreadViewport>
          <ComposerDock>
            <Container>
              <ChatComposer
                key={activeConversationId}
                selectedModel={selectedModel}
                selectedCollectionId={selectedCollectionId}
                collections={collections}
                customModels={customModels}
                apiKeyExists={apiKeyExists}
                sendDisabled={!isConfigured}
                onModelChange={onModelChange}
                onCollectionChange={onCollectionChange}
              />
            </Container>
          </ComposerDock>
        </ThreadPrimitiveRoot>
        </AssistantModelFallbackProvider>
      </ThreadColumn>
    </MainColumn>
  );
}
