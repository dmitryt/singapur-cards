import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

// Mock @assistant-ui/react to avoid runtime initialization in unit tests
vi.mock("@assistant-ui/react", () => ({
  useExternalStoreRuntime: vi.fn((adapter) => adapter),
}));

import { invoke } from "@tauri-apps/api/core";

const mockInvoke = vi.mocked(invoke);

const TEST_STREAM_ID = "00000000-0000-4000-8000-000000000001";

// Test the vocabulary context resolution logic in isolation from the adapter hook
// (the adapter itself is a React hook and requires a component context).
// These tests verify the command wrapper shape expected by the chat runtime.

describe("useChatRuntime - sendChatMessage wrapper (T044)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancelChatStream invokes cancel_chat_stream with streamId", async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { cancelChatStream } = await import("../lib/tauri/commands");
    await cancelChatStream("sid-1");
    expect(mockInvoke).toHaveBeenCalledWith("cancel_chat_stream", { streamId: "sid-1" });
  });

  it("includes streamId and selectedCollectionId in chat request", async () => {
    mockInvoke.mockResolvedValue({
      ok: true,
      data: {
        assistantMessage: "Hello!",
        tokenUsage: null,
        userMessageId: "u1",
        assistantMessageId: "a1",
      },
    });

    const { sendChatMessage } = await import("../lib/tauri/commands");
    await sendChatMessage({
      prompt: "What does apple mean?",
      model: "openai/gpt-4o",
      provider: "openrouter",
      conversationId: "conv-test",
      selectedCollectionId: "col-123",
      streamId: TEST_STREAM_ID,
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      "send_chat_message",
      expect.objectContaining({
        input: expect.objectContaining({
          selectedCollectionId: "col-123",
          streamId: TEST_STREAM_ID,
        }),
      })
    );
  });

  it("sends null selectedCollectionId in no-context mode", async () => {
    mockInvoke.mockResolvedValue({
      ok: true,
      data: {
        assistantMessage: "Hi!",
        tokenUsage: null,
        userMessageId: "u1",
        assistantMessageId: "a1",
      },
    });

    const { sendChatMessage } = await import("../lib/tauri/commands");
    await sendChatMessage({
      prompt: "Hello",
      model: "openai/gpt-4o",
      provider: "openrouter",
      conversationId: "conv-test",
      selectedCollectionId: null,
      streamId: TEST_STREAM_ID,
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      "send_chat_message",
      expect.objectContaining({
        input: expect.objectContaining({
          selectedCollectionId: null,
          conversationId: "conv-test",
          streamId: TEST_STREAM_ID,
        }),
      })
    );
  });

  it("propagates KEY_REQUIRED error from sendChatMessage", async () => {
    mockInvoke.mockResolvedValue({
      ok: false,
      code: "KEY_REQUIRED",
      message: "No API key is saved.",
    });

    const { sendChatMessage } = await import("../lib/tauri/commands");
    const result = await sendChatMessage({
      prompt: "Hello",
      model: "openai/gpt-4o",
      provider: "openrouter",
      conversationId: "conv-test",
      selectedCollectionId: null,
      streamId: TEST_STREAM_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("KEY_REQUIRED");
    }
  });

  it("propagates NOT_FOUND error when collection is set but unavailable", async () => {
    mockInvoke.mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "The selected collection is empty or could not be found.",
    });

    const { sendChatMessage } = await import("../lib/tauri/commands");
    const result = await sendChatMessage({
      prompt: "Hello",
      model: "openai/gpt-4o",
      provider: "openrouter",
      conversationId: "conv-test",
      selectedCollectionId: "col-missing",
      streamId: TEST_STREAM_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_FOUND");
    }
  });

  it("passes provider: openrouter as hardcoded constant", async () => {
    mockInvoke.mockResolvedValue({
      ok: true,
      data: {
        assistantMessage: "OK",
        tokenUsage: null,
        userMessageId: "u1",
        assistantMessageId: "a1",
      },
    });

    const { sendChatMessage } = await import("../lib/tauri/commands");
    await sendChatMessage({
      prompt: "Test",
      model: "openai/gpt-4o",
      provider: "openrouter",
      conversationId: "conv-test",
      selectedCollectionId: null,
      streamId: TEST_STREAM_ID,
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      "send_chat_message",
      expect.objectContaining({
        input: expect.objectContaining({ provider: "openrouter" }),
      })
    );
  });
});
