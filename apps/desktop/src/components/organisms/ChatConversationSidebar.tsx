import { useState } from "react";
import styled from "styled-components";
import { Button, Confirm } from "semantic-ui-react";
import type { ChatConversationSummary } from "../../lib/tauri/commands";
import { formatConversationTime } from "../../features/chat/chatConversationUtils";

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

const RemoveConversationButton = styled(Button)`
  && {
    flex-shrink: 0;
    align-self: center;
    margin: 0 4px 0 0 !important;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
`;

const ConversationItem = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: stretch;
  gap: 2px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : "transparent")};
  background: ${({ $active }) =>
    $active ? "rgba(33, 133, 208, 0.08)" : "transparent"};
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${({ $active }) =>
      $active ? "rgba(33, 133, 208, 0.1)" : "rgba(0,0,0,0.04)"};
  }

  &:hover ${RemoveConversationButton},
  &:focus-within ${RemoveConversationButton} {
    opacity: 1;
  }
`;

const SelectConversationButton = styled.button`
  appearance: none;
  font: inherit;
  flex: 1;
  min-width: 0;
  text-align: left;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: transparent;
  cursor: pointer;
  color: inherit;
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

export interface ChatConversationSidebarProps {
  conversations: ChatConversationSummary[];
  activeConversationId: string;
  onNewChat: () => void;
  onSelectConversation: (conv: ChatConversationSummary) => void;
  onRemoveConversation: (conversationId: string) => void | Promise<void>;
}

export function ChatConversationSidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onRemoveConversation,
}: ChatConversationSidebarProps) {
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  return (
    <ConversationSidebar>
      <SidebarHeading>Conversations</SidebarHeading>
      <Button
        fluid
        basic
        size="small"
        type="button"
        data-testid="new-chat-button"
        onClick={() => void onNewChat()}
      >
        New chat
      </Button>
      <ConversationList>
        {conversations.map((conv) => (
          <ConversationItem key={conv.id} $active={conv.id === activeConversationId}>
            <SelectConversationButton
              type="button"
              data-testid={`conversation-row-${conv.id}`}
              onClick={() => onSelectConversation(conv)}
            >
              <ConversationTitle>{conv.title}</ConversationTitle>
              <ConversationMeta>{formatConversationTime(conv.updatedAt)}</ConversationMeta>
            </SelectConversationButton>
            <RemoveConversationButton
              type="button"
              icon="trash"
              basic
              size="mini"
              color="red"
              aria-label={`Remove conversation ${conv.title}`}
              data-testid={`conversation-remove-${conv.id}`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setRemoveConfirmId(conv.id);
              }}
            />
          </ConversationItem>
        ))}
      </ConversationList>

      <Confirm
        open={removeConfirmId !== null}
        header="Remove conversation?"
        content="Are you sure, you want to remove this conversation?"
        confirmButton={{ content: "Remove", color: "red" } as object}
        onCancel={() => setRemoveConfirmId(null)}
        onConfirm={() => {
          const id = removeConfirmId;
          setRemoveConfirmId(null);
          if (id) void onRemoveConversation(id);
        }}
      />
    </ConversationSidebar>
  );
}
