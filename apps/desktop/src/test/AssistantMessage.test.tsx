/**
 * T026 — Token usage rendering and "Usage unavailable" label behavior.
 *
 * AssistantMessage uses `useMessage` from @assistant-ui/react to read
 * token usage from message metadata.custom.tokenUsage for the footer.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { theme } from "../theme/theme";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

type MockMessage = {
  id: string;
  role: string;
  metadata?: { custom?: Record<string, unknown> };
  content?: readonly { type: string; text: string }[];
};

const defaultAssistantContent = [{ type: "text", text: "Assistant response text" }] as const;

let mockMessage: MockMessage = {
  id: "msg-1",
  role: "assistant",
  content: defaultAssistantContent,
};

vi.mock("@assistant-ui/react", () => ({
  useMessage: vi.fn((selector: (m: MockMessage) => unknown) => selector(mockMessage)),
  MessagePrimitive: {
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Content: () => <div data-testid="message-content">Assistant response text</div>,
  },
  ThreadPrimitive: {
    Root: React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
      ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      ),
    ),
  },
}));

import { AssistantMessage } from "../components/organisms/ChatSemanticThreadMessages";

function renderMessage() {
  return render(
    <ThemeProvider theme={theme}>
      <AssistantMessage />
    </ThemeProvider>
  );
}

describe("AssistantMessage — T026 token usage rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessage = { id: "msg-1", role: "assistant", content: defaultAssistantContent };
  });

  it('shows "Usage unavailable" when no token usage in message metadata', () => {
    renderMessage();
    expect(screen.getByTestId("token-usage-unavailable")).toBeInTheDocument();
    expect(screen.getByText("Usage unavailable")).toBeInTheDocument();
  });

  it("shows total token count in footer when stored in message metadata", () => {
    mockMessage = {
      id: "msg-1",
      role: "assistant",
      content: defaultAssistantContent,
      metadata: {
        custom: { tokenUsage: { promptTokens: 10, completionTokens: 25, totalTokens: 35 } },
      },
    };
    renderMessage();
    expect(screen.getByTestId("token-usage")).toHaveTextContent("35");
    expect(screen.getByTestId("copy-assistant-context")).toBeInTheDocument();
  });

  it('shows "Usage unavailable" when metadata has no tokenUsage', () => {
    mockMessage = { id: "msg-2", role: "assistant", content: defaultAssistantContent, metadata: { custom: {} } };
    renderMessage();
    expect(screen.getByTestId("token-usage-unavailable")).toBeInTheDocument();
  });

  it("renders message content", () => {
    renderMessage();
    expect(screen.getByTestId("message-content")).toBeInTheDocument();
  });

  it('shows "Assistant" as model label when no model id in metadata', () => {
    renderMessage();
    expect(screen.getByTestId("assistant-model-label")).toHaveTextContent("Assistant");
  });

  it("shows friendly model label when model id is in metadata", () => {
    mockMessage = {
      id: "msg-1",
      role: "assistant",
      content: defaultAssistantContent,
      metadata: {
        custom: { model: "openai/gpt-4o-mini" },
      },
    };
    renderMessage();
    expect(screen.getByTestId("assistant-model-label")).toHaveTextContent("GPT-4o Mini");
  });
});
