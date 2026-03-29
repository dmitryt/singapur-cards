import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
    Root: ({
      children,
      ...rest
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div data-testid="thread-root" {...rest}>
        {children}
      </div>
    ),
    Viewport: ({ children }: { children: React.ReactNode }) => <div data-testid="thread-viewport">{children}</div>,
    Messages: () => null,
    Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="thread-empty">{children}</div>,
  },
  ComposerPrimitive: {
    Root: ({ children }: { children: React.ReactNode }) => <div data-testid="composer-root">{children}</div>,
    Input: ({ value }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
      <textarea data-testid="composer-input" value={value} />
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

import { invoke, type InvokeArgs } from "@tauri-apps/api/core";
import { useStore } from "../store";
import ChatPage from "../pages/ChatPage";

const mockInvoke = vi.mocked(invoke);

function conversationIdFromInvokeArgs(args: InvokeArgs | undefined): string {
  if (!args || Array.isArray(args) || args instanceof ArrayBuffer || args instanceof Uint8Array) {
    return "";
  }
  const input = (args as Record<string, unknown>).input;
  if (!input || typeof input !== "object" || Array.isArray(input)) return "";
  const id = (input as Record<string, unknown>).conversationId;
  return typeof id === "string" ? id : "";
}

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
  const defaultConversationRow = {
    id: "test-conv-1",
    title: "New chat",
    updatedAt: new Date().toISOString(),
    model: null as string | null,
    collectionId: null as string | null,
  };

  let mockChatConversationRows: typeof defaultConversationRow[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockErrorMessage = null;
    mockChatConversationRows = [{ ...defaultConversationRow }];
    mockInvoke.mockImplementation((cmd: string, args?: InvokeArgs) => {
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
          data: mockChatConversationRows.map((r) => ({ ...r })),
        });
      }
      if (cmd === "get_chat_messages") return Promise.resolve({ ok: true, data: [] });
      if (cmd === "list_custom_models") return Promise.resolve({ ok: true, data: [{ name: "openai/gpt-4o", title: "GPT-4o", provider: "openrouter" }] });
      if (cmd === "add_custom_model") return Promise.resolve({ ok: true, data: null });
      if (cmd === "delete_custom_model") return Promise.resolve({ ok: true, data: { ok: true } });
      if (cmd === "delete_chat_conversation") {
        const id = conversationIdFromInvokeArgs(args);
        mockChatConversationRows = mockChatConversationRows.filter((c) => c.id !== id);
        return Promise.resolve({
          ok: true,
          data: { deletedConversationId: id },
        });
      }
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
      await user.click(await screen.findByText("GPT-4o", { selector: ':not([role="alert"])' }));

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
      await user.click(await screen.findByText("GPT-4o", { selector: ':not([role="alert"])' }));

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

  describe("Removing a conversation", () => {
    it("calls delete_chat_conversation and refreshes list after confirm", async () => {
      const user = userEvent.setup();
      mockChatConversationRows.push({
        id: "test-conv-2",
        title: "Second chat",
        updatedAt: new Date().toISOString(),
        model: null,
        collectionId: null,
      });

      renderChatPage();
      await screen.findByTestId("conversation-row-test-conv-1");

      await user.click(screen.getByTestId("conversation-remove-test-conv-1"));
      await user.click(screen.getByRole("button", { name: /^Remove$/ }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("delete_chat_conversation", {
          input: { conversationId: "test-conv-1" },
        });
      });

      expect(mockChatConversationRows.map((c) => c.id)).toEqual(["test-conv-2"]);
      await waitFor(() => {
        expect(screen.getByTestId("conversation-row-test-conv-2")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("conversation-row-test-conv-1")).not.toBeInTheDocument();
    });
  });

  describe("Custom models (004)", () => {
    it("model selector lists custom models after built-ins", async () => {
      mockInvoke.mockImplementation((cmd: string, args?: InvokeArgs) => {
        if (cmd === "list_collections") return Promise.resolve({ ok: true, data: [] });
        if (cmd === "get_api_credential") return Promise.resolve({ ok: true, data: { exists: false, maskedKey: null, label: null } });
        if (cmd === "list_chat_conversations") return Promise.resolve({ ok: true, data: [{ ...defaultConversationRow }] });
        if (cmd === "get_chat_messages") return Promise.resolve({ ok: true, data: [] });
        if (cmd === "list_custom_models") return Promise.resolve({ ok: true, data: [{ name: "custom/model-a", title: "Custom A", provider: "custom" }] });
        if (cmd === "add_custom_model") return Promise.resolve({ ok: true, data: null });
        if (cmd === "delete_custom_model") return Promise.resolve({ ok: true, data: { ok: true } });
        return Promise.resolve({ ok: true, data: null });
      });
      renderChatPage();
      const selector = await screen.findByTestId("model-selector");
      await userEvent.setup().click(selector);
      expect((await screen.findAllByText("Custom A")).length).toBeGreaterThan(0);
    });

    it("renders model-selector dropdown", async () => {
      renderChatPage();
      expect(await screen.findByTestId("model-selector")).toBeInTheDocument();
    });

    it("shows list_custom_models error as empty state (no crash)", async () => {
      mockInvoke.mockImplementation((cmd: string, _args?: InvokeArgs) => {
        if (cmd === "list_custom_models") return Promise.resolve({ ok: false, code: "UNEXPECTED_ERROR", message: "DB error" });
        if (cmd === "list_collections") return Promise.resolve({ ok: true, data: [] });
        if (cmd === "get_api_credential") return Promise.resolve({ ok: true, data: { exists: false, maskedKey: null, label: null } });
        if (cmd === "list_chat_conversations") return Promise.resolve({ ok: true, data: [{ ...defaultConversationRow }] });
        if (cmd === "get_chat_messages") return Promise.resolve({ ok: true, data: [] });
        return Promise.resolve({ ok: true, data: null });
      });
      renderChatPage();
      // Page should render without crashing even when list_custom_models fails
      expect(await screen.findByTestId("model-selector")).toBeInTheDocument();
    });
  });

  describe("T043 - Setup guidance when not configured", () => {
    it("blocks sending when neither API key nor model selected", async () => {
      useStore.setState({ apiKeyExists: false });
      renderChatPage();
      expect(await screen.findByText("Select a model…")).toBeInTheDocument();
      expect(screen.getByTestId("composer-send")).toBeDisabled();
    });

    it("enables send when API key and model are selected", async () => {
      const user = userEvent.setup();
      useStore.setState({ apiKeyExists: true });
      renderChatPage();

      await screen.findByTestId("model-selector");
      await user.click(screen.getByTestId("model-selector"));
      await user.click(await screen.findByText("GPT-4o", { selector: ':not([role="alert"])' }));

      await waitFor(() => {
        expect(screen.getByTestId("composer-send")).not.toBeDisabled();
      });
    });
  });
});
