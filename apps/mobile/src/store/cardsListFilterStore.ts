import { create } from 'zustand';

type CardsListFilterState = {
  activeCollectionId: string | null;
  setActiveCollectionId: (id: string | null) => void;
};

export const useCardsListFilterStore = create<CardsListFilterState>((set) => ({
  activeCollectionId: null,
  setActiveCollectionId: (activeCollectionId) => set({ activeCollectionId }),
}));
