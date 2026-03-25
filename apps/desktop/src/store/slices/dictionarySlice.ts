import { StateCreator } from "zustand";
import * as commands from "../../lib/tauri/commands";
import type {
  DictionaryListItem,
  SearchResult,
  HeadwordDetail,
  ImportProgressEvent,
  ImportDictionaryInput,
} from "../../lib/tauri/commands";

export interface DictionaryState {
  dictionaries: DictionaryListItem[];
  importProgress: ImportProgressEvent | null;
  importStatus: "idle" | "importing" | "success" | "error";
  importError: string | null;
  searchQuery: string;
  searchLanguage: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  selectedHeadword: string | null;
  selectedLanguage: string | null;
  headwordDetail: HeadwordDetail | null;
  isLoadingDetail: boolean;
}

export interface DictionaryActions {
  loadDictionaries: () => Promise<void>;
  importDictionary: (input: ImportDictionaryInput) => Promise<void>;
  removeDictionary: (dictionaryId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSearchLanguage: (language: string) => void;
  searchHeadwords: (query: string, language?: string) => Promise<void>;
  selectHeadword: (headword: string, language: string) => void;
  getHeadwordDetail: (headword: string, language: string) => Promise<void>;
  clearHeadwordDetail: () => void;
}

export type DictionarySlice = DictionaryState & DictionaryActions;

export const createDictionarySlice: StateCreator<DictionarySlice> = (set, get) => ({
  dictionaries: [],
  importProgress: null,
  importStatus: "idle",
  importError: null,
  searchQuery: "",
  searchLanguage: "",
  searchResults: [],
  isSearching: false,
  selectedHeadword: null,
  selectedLanguage: null,
  headwordDetail: null,
  isLoadingDetail: false,

  loadDictionaries: async () => {
    const result = await commands.listDictionaries();
    if (result.ok) {
      set({ dictionaries: result.data });
    }
  },

  importDictionary: async (input) => {
    set({ importStatus: "importing", importProgress: null, importError: null });
    const result = await commands.importDictionary(input, (event) => {
      set({ importProgress: event });
    });
    if (result.ok) {
      set({ importStatus: "success" });
      await get().loadDictionaries();
    } else {
      set({ importStatus: "error", importError: result.message });
    }
  },

  removeDictionary: async (dictionaryId) => {
    const result = await commands.removeDictionary(dictionaryId);
    if (result.ok) {
      await get().loadDictionaries();
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchLanguage: (language) => set({ searchLanguage: language }),

  searchHeadwords: async (query, language) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    set({ isSearching: true });
    const result = await commands.searchHeadwords({
      query,
      searchLanguage: language || get().searchLanguage || undefined,
      limit: 50,
    });
    if (result.ok) {
      set({ searchResults: result.data, isSearching: false });
    } else {
      set({ searchResults: [], isSearching: false });
    }
  },

  selectHeadword: (headword, language) => {
    set({ selectedHeadword: headword, selectedLanguage: language });
  },

  getHeadwordDetail: async (headword, language) => {
    set({ isLoadingDetail: true, headwordDetail: null });
    const result = await commands.getHeadwordDetail(headword, language);
    if (result.ok) {
      set({ headwordDetail: result.data, isLoadingDetail: false });
    } else {
      set({ isLoadingDetail: false });
    }
  },

  clearHeadwordDetail: () => {
    set({ headwordDetail: null, selectedHeadword: null, selectedLanguage: null });
  },
});
