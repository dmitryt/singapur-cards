/**
 * T026 — Token usage rendering and "Usage unavailable" label behavior.
 *
 * AssistantMessage uses `useMessage` from @assistant-ui/react to get the
 * token usage stored in message metadata.custom.tokenUsage.
 */
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
};

let mockMessage: MockMessage = { id: "msg-1", role: "assistant" };

vi.mock("@assistant-ui/react", () => ({
  useMessage: vi.fn((selector: (m: MockMessage) => unknown) => selector(mockMessage)),
  MessagePrimitive: {
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Content: () => <div data-testid="message-content">Assistant response text</div>,
  },
}));

import AssistantMessage from "../components/organisms/AssistantMessage";

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
    mockMessage = { id: "msg-1", role: "assistant" };
  });

  it('shows "Usage unavailable" when no token usage in message metadata', () => {
    renderMessage();
    expect(screen.getByTestId("token-usage-unavailable")).toBeInTheDocument();
    expect(screen.getByText("Usage unavailable")).toBeInTheDocument();
  });

  it("shows token usage when stored in message metadata", () => {
    mockMessage = {
      id: "msg-1",
      role: "assistant",
      metadata: {
        custom: { tokenUsage: { promptTokens: 10, completionTokens: 25, totalTokens: 35 } },
      },
    };
    renderMessage();
    expect(screen.getByTestId("token-usage")).toBeInTheDocument();
    expect(screen.getByText(/10 prompt/)).toBeInTheDocument();
    expect(screen.getByText(/25 completion/)).toBeInTheDocument();
    expect(screen.getByText(/35 total/)).toBeInTheDocument();
  });

  it('shows "Usage unavailable" when metadata has no tokenUsage', () => {
    mockMessage = { id: "msg-2", role: "assistant", metadata: { custom: {} } };
    renderMessage();
    expect(screen.getByTestId("token-usage-unavailable")).toBeInTheDocument();
  });

  it("renders message content", () => {
    renderMessage();
    expect(screen.getByTestId("message-content")).toBeInTheDocument();
  });
});
