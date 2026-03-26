import { StateCreator } from "zustand";
import * as commands from "../../lib/tauri/commands";
import type { Language } from "../../lib/tauri/commands";

export interface LanguageState {
  languages: Language[];
  isLoadingLanguages: boolean;
}

export interface LanguageActions {
  loadLanguages: () => Promise<{ firstLanguageCode: string | null }>;
  createLanguage: (code: string, title: string) => Promise<boolean>;
  updateLanguage: (code: string, title: string) => Promise<boolean>;
  deleteLanguage: (code: string) => Promise<{ ok: boolean; error?: string }>;
}

export type LanguageSlice = LanguageState & LanguageActions;

export const createLanguageSlice: StateCreator<LanguageSlice> = (set) => ({
  languages: [],
  isLoadingLanguages: false,

  loadLanguages: async () => {
    set({ isLoadingLanguages: true });
    const result = await commands.listLanguages();
    if (result.ok) {
      const langs = result.data;
      set({ languages: langs, isLoadingLanguages: false });
      return { firstLanguageCode: langs.length > 0 ? langs[0].code : null };
    }
    set({ isLoadingLanguages: false });
    return { firstLanguageCode: null };
  },

  createLanguage: async (code, title) => {
    const result = await commands.createLanguage({ code, title });
    return result.ok;
  },

  updateLanguage: async (code, title) => {
    const result = await commands.updateLanguage({ code, title });
    return result.ok;
  },

  deleteLanguage: async (code) => {
    const result = await commands.deleteLanguage(code);
    if (result.ok) {
      return { ok: true };
    }
    return { ok: false, error: (result as { message: string }).message };
  },
});
