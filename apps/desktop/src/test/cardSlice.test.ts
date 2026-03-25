import { describe, it, expect, vi, beforeEach } from "vitest";
import { create } from "zustand";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

import { invoke } from "@tauri-apps/api/core";
import { createCardSlice, CardSlice } from "../store/slices/cardSlice";

const mockInvoke = vi.mocked(invoke);

function makeStore() {
  return create<CardSlice>()((...args) => createCardSlice(...args));
}

const cardListItem = {
  id: "c1",
  language: "en",
  headword: "hello",
  answerText: "Hallo",
  learningStatus: "unreviewed" as const,
  collectionIds: [],
};

const cardDetail = {
  id: "c1",
  language: "en",
  headword: "hello",
  answerText: "Hallo",
  sourceEntryIds: ["e1"],
  learningStatus: "unreviewed" as const,
  collectionIds: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("cardSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadCards", () => {
    it("sets cards on success", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: true, data: [cardListItem] });

      const store = makeStore();
      await store.getState().loadCards();

      expect(store.getState().cards).toEqual([cardListItem]);
      expect(store.getState().isLoadingCards).toBe(false);
    });

    it("handles failure gracefully", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "UNEXPECTED_ERROR", message: "fail" });

      const store = makeStore();
      await store.getState().loadCards();

      expect(store.getState().cards).toEqual([]);
    });
  });

  describe("createCard", () => {
    it("returns cardId and refreshes list on success", async () => {
      mockInvoke
        .mockResolvedValueOnce({ ok: true, data: { cardId: "c1", learningStatus: "unreviewed" } })
        .mockResolvedValueOnce({ ok: true, data: [cardListItem] });

      const store = makeStore();
      const result = await store.getState().createCard({
        headword: "hello",
        language: "en",
        sourceEntryIds: ["e1"],
      });

      expect(result).toEqual({ cardId: "c1" });
      expect(store.getState().cards).toEqual([cardListItem]);
    });

    it("returns existingCardId on CONFLICT", async () => {
      mockInvoke.mockResolvedValueOnce({
        ok: false,
        code: "CONFLICT",
        message: "Card already exists",
        existingCardId: "c99",
      });

      const store = makeStore();
      const result = await store.getState().createCard({
        headword: "hello",
        language: "en",
        sourceEntryIds: ["e1"],
      });

      expect(result).toEqual({ existingCardId: "c99" });
    });

    it("returns null on unexpected error", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "PERSISTENCE_FAILED", message: "error" });

      const store = makeStore();
      const result = await store.getState().createCard({ headword: "x", language: "en", sourceEntryIds: [] });

      expect(result).toBeNull();
    });
  });

  describe("getCard", () => {
    it("sets activeCard on success", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: true, data: cardDetail });

      const store = makeStore();
      await store.getState().getCard("c1");

      expect(store.getState().activeCard).toEqual(cardDetail);
    });
  });

  describe("updateCard", () => {
    it("returns true and refreshes list on success", async () => {
      mockInvoke
        .mockResolvedValueOnce({ ok: true, data: { cardId: "c1", updatedAt: "2026-06-01T00:00:00Z" } })
        .mockResolvedValueOnce({ ok: true, data: [cardListItem] });

      const store = makeStore();
      const result = await store.getState().updateCard({
        cardId: "c1",
        language: "en",
        headword: "hello",
        answerText: "Hallo",
      });

      expect(result).toBe(true);
    });

    it("returns false on failure", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "NOT_FOUND", message: "not found" });

      const store = makeStore();
      const result = await store.getState().updateCard({
        cardId: "c99",
        language: "en",
        headword: "x",
        answerText: "y",
      });

      expect(result).toBe(false);
    });
  });

  describe("deleteCard", () => {
    it("removes card from local list on success", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: true, data: { deletedCardId: "c1" } });

      const store = makeStore();
      store.setState({ cards: [cardListItem] });
      const result = await store.getState().deleteCard("c1");

      expect(result).toBe(true);
      expect(store.getState().cards).toEqual([]);
    });

    it("returns false and keeps cards on failure", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "NOT_FOUND", message: "not found" });

      const store = makeStore();
      store.setState({ cards: [cardListItem] });
      const result = await store.getState().deleteCard("c1");

      expect(result).toBe(false);
      expect(store.getState().cards).toEqual([cardListItem]);
    });
  });

  describe("clearActiveCard", () => {
    it("sets activeCard to null", () => {
      const store = makeStore();
      store.setState({ activeCard: cardDetail });
      store.getState().clearActiveCard();
      expect(store.getState().activeCard).toBeNull();
    });
  });
});
