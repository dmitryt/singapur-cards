import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { MemoryRouter } from "react-router-dom";
import { theme } from "../theme/theme";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

// Mock the useChatRuntime hook to avoid assistant-ui runtime complexity in tests
const mockClearError = vi.fn();
let mockErrorMessage: string | null = null;

vi.mock("../features/chat/useChatRuntime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../features/chat/useChatRuntime")>();
  return {
    ...actual,
    useChatRuntime: vi.fn(() => ({
      runtime: { __mocked: true },
      errorMessage: mockErrorMessage,
      clearError: mockClearError,
    })),
  };
});

// Mock AssistantRuntimeProvider to just render children
vi.mock("@assistant-ui/react", () => ({
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ThreadPrimitive: {
    Root: ({ children }: { children: React.ReactNode }) => <div data-testid="thread-root">{children}</div>,
    Viewport: ({ children }: { children: React.ReactNode }) => <div data-testid="thread-viewport">{children}</div>,
    Messages: () => null,
    Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="thread-empty">{children}</div>,
  },
  ComposerPrimitive: {
    Root: ({ children }: { children: React.ReactNode }) => <div data-testid="composer-root">{children}</div>,
    Input: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
      <textarea data-testid="composer-input" {...props} />
    ),
    Send: ({ children }: { children?: React.ReactNode }) => (
      <>{children ?? <button data-testid="composer-send">Send</button>}</>
    ),
  },
  MessagePrimitive: {
    Root: ({ children }: { children: React.ReactNode }) => <div data-testid="message-root">{children}</div>,
    Content: () => <div data-testid="message-content" />,
  },
  useMessage: vi.fn(() => null),
}));

import { invoke } from "@tauri-apps/api/core";
import { useStore } from "../store";
import ChatPage from "../pages/ChatPage";

const mockInvoke = vi.mocked(invoke);

function renderChatPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockErrorMessage = null;
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "list_collections") return Promise.resolve({ ok: true, data: [] });
      if (cmd === "get_api_credential") {
        const exists = useStore.getState().apiKeyExists;
        return Promise.resolve({
          ok: true,
          data: { exists, maskedKey: exists ? "abcd••••" : null, label: null },
        });
      }
      if (cmd === "list_chat_conversations") {
        return Promise.resolve({
          ok: true,
          data: [
            {
              id: "test-conv-1",
              title: "New chat",
              updatedAt: new Date().toISOString(),
              model: null,
              collectionId: null,
            },
          ],
        });
      }
      if (cmd === "get_chat_messages") return Promise.resolve({ ok: true, data: [] });
      if (cmd === "create_chat_conversation") {
        return Promise.resolve({ ok: true, data: { id: "test-conv-new" } });
      }
      return Promise.resolve({ ok: true, data: null });
    });
    useStore.setState({
      apiKeyExists: false,
      collections: [],
    });
  });

  describe("T042 - Send gate: API key + model required", () => {
    it("send button is disabled when no model is selected and no API key", async () => {
      renderChatPage();
      const sendBtn = await screen.findByTestId("composer-send");
      expect(sendBtn).toBeDisabled();
    });

    it("send button is disabled when model is selected but no API key saved", async () => {
      const user = userEvent.setup();
      useStore.setState({ apiKeyExists: false });
      renderChatPage();

      await screen.findByTestId("model-selector");
      await user.click(screen.getByTestId("model-selector"));
      await user.click(await screen.findByText("GPT-4o"));

      expect(screen.getByTestId("composer-send")).toBeDisabled();
    });

    it("send button is disabled when API key exists but no model selected", async () => {
      useStore.setState({ apiKeyExists: true });
      renderChatPage();
      expect((await screen.findByTestId("composer-send"))).toBeDisabled();
    });

    it("send button is enabled when both API key and model are selected", async () => {
      const user = userEvent.setup();
      useStore.setState({ apiKeyExists: true });
      renderChatPage();

      await screen.findByTestId("model-selector");
      await user.click(screen.getByTestId("model-selector"));
      await user.click(await screen.findByText("GPT-4o"));

      expect(screen.getByTestId("composer-send")).not.toBeDisabled();
    });
  });

  describe("T012 - Model selector", () => {
    it("renders model selector with no default selection", async () => {
      renderChatPage();
      expect(await screen.findByTestId("model-selector")).toBeInTheDocument();
    });

    it("shows placeholder text when no model selected", async () => {
      renderChatPage();
      expect(await screen.findByText("Select a model…")).toBeInTheDocument();
    });
  });

  describe("T012 - Collection selector", () => {
    it("renders collection selector with no-collection option", async () => {
      renderChatPage();
      expect(await screen.findByTestId("collection-selector")).toBeInTheDocument();
      expect(screen.getAllByText("No collection").length).toBeGreaterThan(0);
    });
  });

  describe("T013 - Error display", () => {
    it("shows error banner when errorMessage is set", async () => {
      mockErrorMessage = "No API key is saved. Go to Profile to add your OpenRouter key.";
      renderChatPage();
      expect(await screen.findByTestId("error-banner")).toBeInTheDocument();
      expect(screen.getByText(/No API key/)).toBeInTheDocument();
    });

    it("does not show error banner when no error", async () => {
      mockErrorMessage = null;
      renderChatPage();
      await screen.findByTestId("composer-send");
      expect(screen.queryByTestId("error-banner")).not.toBeInTheDocument();
    });
  });

  describe("T043 - Setup guidance when not configured", () => {
    it("shows setup guidance when neither API key nor model selected", async () => {
      useStore.setState({ apiKeyExists: false });
      renderChatPage();
      expect(await screen.findByTestId("setup-guidance")).toBeInTheDocument();
    });

    it("does not show setup guidance when fully configured", async () => {
      const user = userEvent.setup();
      useStore.setState({ apiKeyExists: true });
      renderChatPage();

      await screen.findByTestId("model-selector");
      await user.click(screen.getByTestId("model-selector"));
      await user.click(await screen.findByText("GPT-4o"));

      await waitFor(() => {
        expect(screen.queryByTestId("setup-guidance")).not.toBeInTheDocument();
      });
    });
  });
});
