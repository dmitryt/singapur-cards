import styled from "styled-components";
import { Button, TextArea, Dropdown as SUIDropdown } from "semantic-ui-react";
import { ComposerPrimitive } from "@assistant-ui/react";
import { SUPPORTED_MODELS, NO_COLLECTION_LABEL } from "../../features/chat/constants";
import type { CollectionListItem } from "../../lib/tauri/commands";

// ── Styles ────────────────────────────────────────────────────────────────────

const ComposerCard = styled.div`
  margin: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
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
  apiKeyExists,
  sendDisabled,
  onModelChange,
  onCollectionChange,
}: ChatComposerProps) {
  const modelOptions = SUPPORTED_MODELS.map((m) => ({ key: m.id, value: m.id, text: m.label }));

  const collectionOptions = [
    { key: "__none__", value: "", text: NO_COLLECTION_LABEL },
    ...collections.map((c) => ({ key: c.id, value: c.id, text: c.name })),
  ];

  const selectedModelLabel = SUPPORTED_MODELS.find((m) => m.id === selectedModel)?.label;
  const selectedCollectionLabel = collections.find((c) => c.id === selectedCollectionId)?.name;

  return (
    <ComposerCard>
      <ComposerPrimitive.Root>
        <ComposerPrimitive.Input asChild>
          <TextArea
            placeholder={
              !apiKeyExists
                ? "Configure your API key to start chatting…"
                : "Ask something about your vocabulary…"
            }
            style={{
              resize: "none",
              minHeight: "60px",
              maxHeight: "160px",
              border: "none",
              borderRadius: "16px 16px 0 0",
              padding: "12px 16px",
              outline: "none",
              boxShadow: "none",
              width: "100%",
            }}
          />
        </ComposerPrimitive.Input>

        <ComposerBottomBar>
          <ChipDropdownWrapper>
            <SUIDropdown
              inline
              data-testid="model-selector"
              options={modelOptions}
              value={selectedModel ?? ""}
              onChange={(_e, { value }) => onModelChange((value as string) || null)}
              text={selectedModelLabel ?? "Select a model…"}
            />
          </ChipDropdownWrapper>

          <ChipDropdownWrapper>
            <SUIDropdown
              inline
              data-testid="collection-selector"
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
