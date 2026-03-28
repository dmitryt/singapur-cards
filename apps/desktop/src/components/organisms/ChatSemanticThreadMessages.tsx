import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styled from "styled-components";
import { Icon, Message } from "semantic-ui-react";
import {
  MessagePrimitive,
  MessagePartPrimitive,
  useMessage,
  type TextMessagePartProps,
} from "@assistant-ui/react";
import type { TokenUsageData } from "../../lib/tauri/commands";
import { resolveChatModelLabel } from "../../features/chat/constants";
import { type ModelAnswerPart, parseModelAnswer } from "../../lib/modelAnswerMarkup";

function ModelAnswerRenderedParts({ parts }: { parts: ModelAnswerPart[] }) {
  return parts.map((p, idx) => (
    <Fragment key={idx}>
      {p.type === "text" && (
        p.text
      )}
      {p.type === "strong" && (
        <span className="model-answer-strong">
          {p.text}
        </span>
      )}
      {p.type === "highlight" && (
        <span className="model-answer-highlight">
          {p.text}
        </span>
      )}
    </Fragment>
  ));
}

function AssistantMessageTextPart(props: TextMessagePartProps) {
  const { text, status } = props;
  const isRunning = status.type === "running";
  const parsed = useMemo(() => parseModelAnswer(text), [text]);

  if (isRunning) {
    return (
      <p style={{ whiteSpace: "pre-line" }}>
        <MessagePartPrimitive.Text />
        <MessagePartPrimitive.InProgress>
          <span style={{ fontFamily: "revert" }}>{" \u25CF"}</span>
        </MessagePartPrimitive.InProgress>
      </p>
    );
  }

  return (
    <p style={{ whiteSpace: "pre-line" }}>
      <ModelAnswerRenderedParts parts={parsed} />
    </p>
  );
}

const AssistantLayout = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: flex-start;
`;

const AssistantMessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const AvatarFrame = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textSecondary};

  .icon {
    font-size: 16px;
    line-height: 1;
    margin: 0;
  }
`;

const AssistantMain = styled.div`
  flex: 1;
  min-width: 0;
`;

const ModelName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.3;
`;

const AssistantMessageFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
  padding: 0 ${({ theme }) => theme.spacing.xs};
  min-height: 24px;
`;

const FooterIconButtons = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const FooterIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  margin: 0;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.background};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .icon {
    margin: 0;
  }
`;

const FooterTokenCount = styled.div`
  font-size: 0.75rem;
  font-style: italic;

  color: #aaa;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
`;

/** When assistant `metadata_json` has no per-message `model` (legacy rows), label uses this. */
const AssistantModelFallbackContext = createContext<string | null>(null);

export function AssistantModelFallbackProvider({
  fallbackModelId,
  children,
}: {
  fallbackModelId: string | null;
  children: ReactNode;
}) {
  return (
    <AssistantModelFallbackContext.Provider value={fallbackModelId}>
      {children}
    </AssistantModelFallbackContext.Provider>
  );
}

export function UserMessage() {
  return (
    <MessagePrimitive.Root>
      <Message compact info size="mini">
        <MessagePrimitive.Content />
      </Message>
    </MessagePrimitive.Root>
  );
}

export function AssistantMessage() {
  const fallbackModelId = useContext(AssistantModelFallbackContext);
  // useMessage → useSyncExternalStore: selector must not allocate a new object each getSnapshot.
  const tokenUsage = useMessage((m) => {
    const custom = m.metadata?.custom as Record<string, unknown> | undefined;
    return (custom?.tokenUsage as TokenUsageData | undefined) ?? null;
  });
  const modelId = useMessage((m) => {
    const custom = m.metadata?.custom as Record<string, unknown> | undefined;
    return typeof custom?.model === "string" ? custom.model : null;
  });

  const effectiveModelId = modelId ?? fallbackModelId;
  const modelLabel = resolveChatModelLabel(effectiveModelId);
  const messageBodyRef = useRef<HTMLDivElement>(null);
  const [canCopy, setCanCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const text = messageBodyRef.current?.textContent ?? "";
    setCanCopy(text.trim().length > 0);
  });

  useEffect(() => {
    return () => {
      if (copiedResetTimerRef.current) clearTimeout(copiedResetTimerRef.current);
    };
  }, []);

  const handleCopyContext = useCallback(() => {
    const text = messageBodyRef.current?.textContent ?? "";
    if (!text.trim()) return;
    void navigator.clipboard.writeText(text).then(() => {
      if (copiedResetTimerRef.current) clearTimeout(copiedResetTimerRef.current);
      setCopied(true);
      copiedResetTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedResetTimerRef.current = null;
      }, 2000);
    });
  }, []);

  return (
    <MessagePrimitive.Root>
      <AssistantLayout>
        <AssistantMain>
          <AssistantMessageHeader>
            <AvatarFrame aria-hidden>
              <Icon name="reddit" />
            </AvatarFrame>
            <ModelName data-testid="assistant-model-label">{modelLabel}</ModelName>
          </AssistantMessageHeader>
          <Message floating size="mini">
            <div ref={messageBodyRef}>
              <MessagePrimitive.Content
                components={{
                  Text: AssistantMessageTextPart,
                }}
              />
            </div>
          </Message>
          <AssistantMessageFooter>
            <FooterIconButtons>
              <FooterIconButton
                type="button"
                data-testid="copy-assistant-context"
                aria-label={copied ? "Copied" : "Copy assistant message"}
                title={copied ? "Copied" : "Copy assistant message"}
                disabled={!canCopy}
                onClick={handleCopyContext}
              >
                <Icon name={copied ? "check" : "copy"} aria-hidden="true" />
              </FooterIconButton>
            </FooterIconButtons>
            {tokenUsage ? (
              <FooterTokenCount data-testid="token-usage" aria-label={`${tokenUsage.totalTokens} tokens used`}>
                {tokenUsage.totalTokens} tokens
              </FooterTokenCount>
            ) : (
              <FooterTokenCount data-testid="token-usage-unavailable" aria-label="Token usage unavailable">
                Usage unavailable
              </FooterTokenCount>
            )}
          </AssistantMessageFooter>
        </AssistantMain>
      </AssistantLayout>
    </MessagePrimitive.Root>
  );
}
