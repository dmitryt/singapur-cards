import { create } from "zustand";
import { createDictionarySlice, DictionarySlice } from "./slices/dictionarySlice";
import { createCardSlice, CardSlice } from "./slices/cardSlice";
import { createCollectionSlice, CollectionSlice } from "./slices/collectionSlice";
import { createReviewSessionSlice, ReviewSessionSlice } from "./slices/reviewSessionSlice";
import { createLanguageSlice, LanguageSlice } from "./slices/languageSlice";
import { createProfileSlice, ProfileSlice } from "./slices/profileSlice";

export type AppStore = DictionarySlice & CardSlice & CollectionSlice & ReviewSessionSlice & LanguageSlice & ProfileSlice;

export const useStore = create<AppStore>()((...args) => ({
  ...createDictionarySlice(...args),
  ...createCardSlice(...args),
  ...createCollectionSlice(...args),
  ...createReviewSessionSlice(...args),
  ...createLanguageSlice(...args),
  ...createProfileSlice(...args),
}));
