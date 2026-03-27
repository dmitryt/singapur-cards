import { StateCreator } from "zustand";

export interface ProfileState {
  selectedLanguage: string;
}

export interface ProfileActions {
  setSelectedLanguage: (code: string) => void;
}

export type ProfileSlice = ProfileState & ProfileActions;

export const createProfileSlice: StateCreator<ProfileSlice> = (set) => ({
  selectedLanguage: "",

  setSelectedLanguage: (code) => {
    set({ selectedLanguage: code });
  },
});
