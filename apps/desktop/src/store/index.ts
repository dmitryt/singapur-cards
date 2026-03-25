import { create } from "zustand";
import { createDictionarySlice, DictionarySlice } from "./slices/dictionarySlice";
import { createCardSlice, CardSlice } from "./slices/cardSlice";
import { createCollectionSlice, CollectionSlice } from "./slices/collectionSlice";
import { createReviewSessionSlice, ReviewSessionSlice } from "./slices/reviewSessionSlice";

export type AppStore = DictionarySlice & CardSlice & CollectionSlice & ReviewSessionSlice;

export const useStore = create<AppStore>()((...args) => ({
  ...createDictionarySlice(...args),
  ...createCardSlice(...args),
  ...createCollectionSlice(...args),
  ...createReviewSessionSlice(...args),
}));
