import { describe, it, expect, vi, beforeEach } from "vitest";
import { create } from "zustand";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

import { invoke } from "@tauri-apps/api/core";
import { createDictionarySlice, DictionarySlice } from "../store/slices/dictionarySlice";

const mockInvoke = vi.mocked(invoke);

function makeStore() {
  return create<DictionarySlice>()((...args) => createDictionarySlice(...args));
}

describe("dictionarySlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadDictionaries", () => {
    it("populates dictionaries on success", async () => {
      const dictionaries = [
        { id: "d1", name: "English-German", languageFrom: "en", languageTo: "de", importStatus: "ready", entryCount: 1000 },
      ];
      mockInvoke.mockResolvedValueOnce({ ok: true, data: dictionaries });

      const store = makeStore();
      await store.getState().loadDictionaries();

      expect(store.getState().dictionaries).toEqual(dictionaries);
    });

    it("leaves dictionaries unchanged on failure", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "UNEXPECTED_ERROR", message: "fail" });

      const store = makeStore();
      await store.getState().loadDictionaries();

      expect(store.getState().dictionaries).toEqual([]);
    });
  });

  describe("searchHeadwords", () => {
    it("sets search results on success", async () => {
      const results = [
        { headword: "hello", language: "en", sourceEntryIds: ["e1"], previewText: "Hallo", matchKind: "exact", contributingDictionaryCount: 1 },
      ];
      mockInvoke.mockResolvedValueOnce({ ok: true, data: results });

      const store = makeStore();
      await store.getState().searchHeadwords("hello");

      expect(store.getState().searchResults).toEqual(results);
      expect(store.getState().isSearching).toBe(false);
    });

    it("clears results for empty query without invoking", async () => {
      const store = makeStore();
      store.setState({
        searchResults: [{ headword: "x", language: "en", sourceEntryIds: [], previewText: "", matchKind: "exact" as const, contributingDictionaryCount: 1 }],
      });
      await store.getState().searchHeadwords("  ");

      expect(store.getState().searchResults).toEqual([]);
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("clears results on failure", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: false, code: "UNEXPECTED_ERROR", message: "fail" });

      const store = makeStore();
      await store.getState().searchHeadwords("hello");

      expect(store.getState().searchResults).toEqual([]);
      expect(store.getState().isSearching).toBe(false);
    });
  });

  describe("getHeadwordDetail", () => {
    it("sets headwordDetail on success", async () => {
      const detail = {
        headword: "hello",
        language: "en",
        sourceEntryIds: ["e1"],
        entries: [{ entryId: "e1", dictionaryId: "d1", languageTo: "de", dictionaryName: "Dict", definitionText: "Hallo" }],
      };
      mockInvoke.mockResolvedValueOnce({ ok: true, data: detail });

      const store = makeStore();
      await store.getState().getHeadwordDetail("hello", "en");

      expect(store.getState().headwordDetail).toEqual(detail);
      expect(store.getState().isLoadingDetail).toBe(false);
    });
  });

  describe("clearHeadwordDetail", () => {
    it("resets headword state", () => {
      const store = makeStore();
      store.setState({
        headwordDetail: { headword: "hi", language: "en", sourceEntryIds: [], entries: [] },
        selectedHeadword: "hi",
        selectedLanguage: "en",
      });
      store.getState().clearHeadwordDetail();

      expect(store.getState().headwordDetail).toBeNull();
      expect(store.getState().selectedHeadword).toBeNull();
    });
  });

  describe("setSearchQuery / setSearchLanguage", () => {
    it("updates searchQuery", () => {
      const store = makeStore();
      store.getState().setSearchQuery("apple");
      expect(store.getState().searchQuery).toBe("apple");
    });

    it("updates searchLanguage", () => {
      const store = makeStore();
      store.getState().setSearchLanguage("de");
      expect(store.getState().searchLanguage).toBe("de");
    });
  });
});
