import { describe, it, expect, vi, beforeEach } from "vitest";
import { create } from "zustand";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  Channel: vi.fn().mockImplementation(() => ({ onmessage: null })),
}));

import { invoke } from "@tauri-apps/api/core";
import { createDictionarySlice, DictionarySlice } from "../store/slices/dictionarySlice";
import { createProfileSlice, ProfileSlice } from "../store/slices/profileSlice";

const mockInvoke = vi.mocked(invoke);

type TestStore = DictionarySlice & ProfileSlice;

function makeStore() {
  return create<TestStore>()((...args) => ({
    ...createDictionarySlice(...args),
    ...createProfileSlice(...args),
  }));
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
      });
      store.getState().clearHeadwordDetail();

      expect(store.getState().headwordDetail).toBeNull();
      expect(store.getState().selectedHeadword).toBeNull();
    });
  });
});
