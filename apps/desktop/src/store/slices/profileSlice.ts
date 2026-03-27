import { StateCreator } from "zustand";
import * as commands from "../../lib/tauri/commands";

export interface ProfileState {
  selectedLanguage: string;
  apiKeyExists: boolean;
  apiKeyMasked: string | null;
}

export interface ProfileActions {
  setSelectedLanguage: (code: string) => void;
  loadApiKeyStatus: () => Promise<void>;
  setApiKeyExists: (exists: boolean, masked: string | null) => void;
}

export type ProfileSlice = ProfileState & ProfileActions;

export const createProfileSlice: StateCreator<ProfileSlice> = (set) => ({
  selectedLanguage: "de",
  apiKeyExists: false,
  apiKeyMasked: null,

  setSelectedLanguage: (code) => {
    set({ selectedLanguage: code });
  },

  loadApiKeyStatus: async () => {
    const result = await commands.getApiCredential("openrouter");
    if (result.ok) {
      set({ apiKeyExists: result.data.exists, apiKeyMasked: result.data.maskedKey });
    }
  },

  setApiKeyExists: (exists, masked) => {
    set({ apiKeyExists: exists, apiKeyMasked: masked });
  },
});
