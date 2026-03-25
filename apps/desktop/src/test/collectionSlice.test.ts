import { describe, it, expect, vi, beforeEach } from "vitest";
import { create } from "zustand";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

import { invoke } from "@tauri-apps/api/core";
import { createCollectionSlice, CollectionSlice } from "../store/slices/collectionSlice";

const mockInvoke = vi.mocked(invoke);

function makeStore() {
  return create<CollectionSlice>()((...args) => createCollectionSlice(...args));
}

const collectionItem = { id: "col1", name: "Verbs", cardCount: 2 };

describe("collectionSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadCollections", () => {
    it("sets collections on success", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: true, data: [collectionItem] });

      const store = makeStore();
      await store.getState().loadCollections();

      expect(store.getState().collections).toEqual([collectionItem]);
      expect(store.getState().isLoadingCollections).toBe(false);
    });

    it("handles failure gracefully", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "UNEXPECTED_ERROR", message: "fail" });

      const store = makeStore();
      await store.getState().loadCollections();

      expect(store.getState().collections).toEqual([]);
    });
  });

  describe("createCollection", () => {
    it("returns collectionId and refreshes list on success", async () => {
      mockInvoke
        .mockResolvedValueOnce({ ok: true, data: { collectionId: "col1", name: "Verbs" } })
        .mockResolvedValueOnce({ ok: true, data: [collectionItem] });

      const store = makeStore();
      const id = await store.getState().createCollection({ name: "Verbs" });

      expect(id).toBe("col1");
      expect(store.getState().collections).toEqual([collectionItem]);
    });

    it("returns null on failure", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "PERSISTENCE_FAILED", message: "fail" });

      const store = makeStore();
      const id = await store.getState().createCollection({ name: "Verbs" });

      expect(id).toBeNull();
    });
  });

  describe("renameCollection", () => {
    it("returns true and refreshes list on success", async () => {
      mockInvoke
        .mockResolvedValueOnce({ ok: true, data: { collectionId: "col1", name: "Action Verbs", updatedAt: "2026-06-01" } })
        .mockResolvedValueOnce({ ok: true, data: [{ ...collectionItem, name: "Action Verbs" }] });

      const store = makeStore();
      const ok = await store.getState().renameCollection("col1", "Action Verbs");

      expect(ok).toBe(true);
    });

    it("returns false on failure", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "NOT_FOUND", message: "not found" });

      const store = makeStore();
      const ok = await store.getState().renameCollection("col1", "New Name");

      expect(ok).toBe(false);
    });
  });

  describe("deleteCollection", () => {
    it("clears selectedCollectionId when deleting the active collection", async () => {
      mockInvoke
        .mockResolvedValueOnce({ ok: true, data: { deletedCollectionId: "col1" } })
        .mockResolvedValueOnce({ ok: true, data: [] });

      const store = makeStore();
      store.setState({ selectedCollectionId: "col1", collections: [collectionItem] });
      await store.getState().deleteCollection("col1");

      expect(store.getState().selectedCollectionId).toBeNull();
    });

    it("keeps selectedCollectionId when deleting a different collection", async () => {
      mockInvoke
        .mockResolvedValueOnce({ ok: true, data: { deletedCollectionId: "col2" } })
        .mockResolvedValueOnce({ ok: true, data: [collectionItem] });

      const store = makeStore();
      store.setState({ selectedCollectionId: "col1" });
      await store.getState().deleteCollection("col2");

      expect(store.getState().selectedCollectionId).toBe("col1");
    });
  });

  describe("selectCollection", () => {
    it("sets selectedCollectionId", () => {
      const store = makeStore();
      store.getState().selectCollection("col1");
      expect(store.getState().selectedCollectionId).toBe("col1");
    });

    it("can clear selection with null", () => {
      const store = makeStore();
      store.setState({ selectedCollectionId: "col1" });
      store.getState().selectCollection(null);
      expect(store.getState().selectedCollectionId).toBeNull();
    });
  });
});
