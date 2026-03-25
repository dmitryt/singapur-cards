import { describe, it, expect, vi, beforeEach } from "vitest";
import { create } from "zustand";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

import { invoke } from "@tauri-apps/api/core";
import { createReviewSessionSlice, ReviewSessionSlice } from "../store/slices/reviewSessionSlice";

const mockInvoke = vi.mocked(invoke);

function makeStore() {
  return create<ReviewSessionSlice>()((...args) => createReviewSessionSlice(...args));
}

describe("reviewSessionSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startSession", () => {
    it("sets sessionCardIds on success", async () => {
      mockInvoke.mockResolvedValueOnce({
        ok: true,
        data: { sessionCardIds: ["c1", "c2", "c3"], totalCards: 3 },
      });

      const store = makeStore();
      await store.getState().startSession();

      expect(store.getState().sessionCardIds).toEqual(["c1", "c2", "c3"]);
      expect(store.getState().currentIndex).toBe(0);
      expect(store.getState().isFlipped).toBe(false);
      expect(store.getState().isStarting).toBe(false);
      expect(store.getState().sessionComplete).toBe(false);
    });

    it("sets sessionComplete when no cards returned", async () => {
      mockInvoke.mockResolvedValueOnce({
        ok: true,
        data: { sessionCardIds: [], totalCards: 0 },
      });

      const store = makeStore();
      await store.getState().startSession();

      expect(store.getState().sessionCardIds).toEqual([]);
      expect(store.getState().sessionComplete).toBe(true);
    });

    it("keeps sessionCardIds unchanged on failure", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "UNEXPECTED_ERROR", message: "fail" });

      const store = makeStore();
      await store.getState().startSession();

      expect(store.getState().sessionCardIds).toEqual([]);
      expect(store.getState().isStarting).toBe(false);
    });

    it("preserves server-enforced card order — no re-sorting", async () => {
      const serverOrder = ["c3", "c1", "c2"];
      mockInvoke.mockResolvedValueOnce({
        ok: true,
        data: { sessionCardIds: serverOrder, totalCards: 3 },
      });

      const store = makeStore();
      await store.getState().startSession();

      expect(store.getState().sessionCardIds).toEqual(serverOrder);
    });
  });

  describe("flipCard", () => {
    it("toggles isFlipped", () => {
      const store = makeStore();
      expect(store.getState().isFlipped).toBe(false);
      store.getState().flipCard();
      expect(store.getState().isFlipped).toBe(true);
      store.getState().flipCard();
      expect(store.getState().isFlipped).toBe(false);
    });
  });

  describe("recordResult", () => {
    it("calls record_review_result command", async () => {
      mockInvoke.mockResolvedValueOnce({
        ok: true,
        data: { cardId: "c1", learningStatus: "learned", reviewedAt: "2026-06-01" },
      });

      const store = makeStore();
      await store.getState().recordResult("c1", "learned");

      expect(mockInvoke).toHaveBeenCalledWith(
        "record_review_result",
        expect.objectContaining({ input: { cardId: "c1", result: "learned" } })
      );
    });
  });

  describe("advance", () => {
    it("increments currentIndex and resets isFlipped", () => {
      const store = makeStore();
      store.setState({ sessionCardIds: ["c1", "c2", "c3"], currentIndex: 0, isFlipped: true });
      store.getState().advance();
      expect(store.getState().currentIndex).toBe(1);
      expect(store.getState().isFlipped).toBe(false);
    });

    it("sets sessionComplete when advancing past last card", () => {
      const store = makeStore();
      store.setState({ sessionCardIds: ["c1"], currentIndex: 0 });
      store.getState().advance();
      expect(store.getState().sessionComplete).toBe(true);
    });
  });

  describe("resetSession", () => {
    it("resets all session state", () => {
      const store = makeStore();
      store.setState({ sessionCardIds: ["c1"], currentIndex: 1, isFlipped: true, sessionComplete: true });
      store.getState().resetSession();

      expect(store.getState().sessionCardIds).toEqual([]);
      expect(store.getState().currentIndex).toBe(0);
      expect(store.getState().isFlipped).toBe(false);
      expect(store.getState().sessionComplete).toBe(false);
    });
  });
});
