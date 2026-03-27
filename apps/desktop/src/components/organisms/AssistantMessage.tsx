import styled from "styled-components";
import { MessagePrimitive, useMessage } from "@assistant-ui/react";
import type { TokenUsageData } from "../../lib/tauri/commands";

const MessageWrapper = styled.div`
  align-self: flex-start;
  max-width: 80%;
`;

const MessageBubble = styled.div`
  background-color: ${({ theme }) => theme.colors.secondary ?? "#f0f0f0"};
  color: ${({ theme }) => theme.colors.text ?? "#333"};
  border-radius: 12px;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  word-break: break-word;
  white-space: pre-wrap;
`;

const TokenUsageWrapper = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary ?? "#999"};
  margin-top: ${({ theme }) => theme.spacing.xs};
  padding-left: ${({ theme }) => theme.spacing.sm};
`;

interface TokenUsageDisplayProps {
  prompt: number;
  completion: number;
  total: number;
}

function TokenUsageDisplay({ prompt, completion, total }: TokenUsageDisplayProps) {
  return (
    <TokenUsageWrapper data-testid="token-usage">
      Tokens: {prompt} prompt + {completion} completion = {total} total
    </TokenUsageWrapper>
  );
}

function AssistantMessage() {
  const tokenUsage = useMessage((m) => {
    const custom = m.metadata?.custom as Record<string, unknown> | undefined;
    return (custom?.tokenUsage as TokenUsageData | undefined) ?? null;
  });

  return (
    <MessagePrimitive.Root>
      <MessageWrapper>
        <MessageBubble>
          <MessagePrimitive.Content />
        </MessageBubble>
        {tokenUsage ? (
          <TokenUsageDisplay
            prompt={tokenUsage.promptTokens}
            completion={tokenUsage.completionTokens}
            total={tokenUsage.totalTokens}
          />
        ) : (
          <TokenUsageWrapper data-testid="token-usage-unavailable">
            Usage unavailable
          </TokenUsageWrapper>
        )}
      </MessageWrapper>
    </MessagePrimitive.Root>
  );
}

export default AssistantMessage;
