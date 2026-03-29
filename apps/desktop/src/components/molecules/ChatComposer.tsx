import styled from "styled-components";
import { Button, TextArea, Dropdown as SUIDropdown } from "semantic-ui-react";
import { ComposerPrimitive } from "@assistant-ui/react";
import { NO_COLLECTION_LABEL } from "../../features/chat/constants";
import type { CollectionListItem, SavedModelItem } from "../../lib/tauri/commands";
import { useMemo } from "react";

// ── Styles ────────────────────────────────────────────────────────────────────

const ComposerCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: visible;
`;

const ComposerBottomBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const BottomBarSpacer = styled.div`
  flex: 1;
`;

const ComposerTextArea = styled(TextArea)`
  font-size: 1rem;
  resize: none;
  min-height: 60px;
  max-height: 160px;
  border: none;
  border-radius: 16px 16px 0 0;
  padding: 12px ${({ theme }) => theme.spacing.md};
  outline: none;
  box-shadow: none;
  width: 100%;
`;

const ChipDropdownWrapper = styled.div`
  .ui.inline.dropdown {
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.textSecondary};

    &:hover {
      background: #f5f5f5;
    }

    .menu {
      border-radius: 8px;
      min-width: 200px;
    }
  }
`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatComposerProps {
  selectedModel: string | null;
  selectedCollectionId: string | null;
  collections: CollectionListItem[];
  customModels: SavedModelItem[];
  apiKeyExists: boolean;
  sendDisabled: boolean;
  onModelChange: (value: string | null) => void;
  onCollectionChange: (value: string | null) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatComposer({
  selectedModel,
  selectedCollectionId,
  collections,
  customModels,
  apiKeyExists,
  sendDisabled,
  onModelChange,
  onCollectionChange,
}: ChatComposerProps) {

  const collectionOptions = useMemo (() => collections.map((c) => ({ key: c.id, value: c.id, text: c.name })), [collections]);
  const modelOptions = useMemo (() => customModels.map((c) => ({ key: c.name, value: c.name, text: c.title })), [customModels]);

  const selectedCollectionLabel = collections.find((c) => c.id === selectedCollectionId)?.name;

  return (
    <ComposerCard>
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input asChild>
          <ComposerTextArea
            placeholder={
              !apiKeyExists
                ? "Configure your API key to start chatting…"
                : "Ask something about your vocabulary…"
            }
          />
        </ComposerPrimitive.Input>

        <ComposerBottomBar>
          <ChipDropdownWrapper>
            <SUIDropdown
              inline
              upward
              data-testid="model-selector"
              placeholder="Select a model…"
              options={modelOptions}
              value={selectedModel ?? ""}
              onChange={(_e, { value }) => onModelChange((value as string) || null)}
            />
          </ChipDropdownWrapper>

          <ChipDropdownWrapper>
            <SUIDropdown
              inline
              data-testid="collection-selector"
              placeholder="No Collection"
              options={collectionOptions}
              value={selectedCollectionId ?? ""}
              onChange={(_e, { value }) => onCollectionChange((value as string) || null)}
              text={selectedCollectionLabel ?? NO_COLLECTION_LABEL}
            />
          </ChipDropdownWrapper>

          <BottomBarSpacer />

          <ComposerPrimitive.Send asChild>
            <Button
              primary
              size="small"
              data-testid="composer-send"
              disabled={sendDisabled}
            >
              Send
            </Button>
          </ComposerPrimitive.Send>
        </ComposerBottomBar>
      </ComposerPrimitive.Root>
    </ComposerCard>
  );
}
