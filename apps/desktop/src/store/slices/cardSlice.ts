import { StateCreator } from "zustand";
import * as commands from "../../lib/tauri/commands";
import type { CardListItem, CardDetail, CreateCardInput, UpdateCardInput } from "../../lib/tauri/commands";

export interface CardState {
  cards: CardListItem[];
  activeCard: CardDetail | null;
  isLoadingCards: boolean;
  isLoadingCard: boolean;
}

export interface CardActions {
  loadCards: (collectionId?: string, learningStatus?: "unreviewed" | "learned" | "not_learned") => Promise<void>;
  createCard: (input: CreateCardInput) => Promise<{ cardId: string } | { existingCardId: string } | null>;
  updateCard: (input: UpdateCardInput) => Promise<boolean>;
  getCard: (cardId: string) => Promise<void>;
  deleteCard: (cardId: string) => Promise<boolean>;
  clearActiveCard: () => void;
}

export type CardSlice = CardState & CardActions;

export const createCardSlice: StateCreator<CardSlice> = (set, get) => ({
  cards: [],
  activeCard: null,
  isLoadingCards: false,
  isLoadingCard: false,

  loadCards: async (collectionId, learningStatus) => {
    set({ isLoadingCards: true });
    const result = await commands.listCards(collectionId, learningStatus);
    if (result.ok) {
      set({ cards: result.data, isLoadingCards: false });
    } else {
      set({ isLoadingCards: false });
    }
  },

  createCard: async (input) => {
    const result = await commands.createCardFromHeadwordDetail(input);
    if (result.ok) {
      await get().loadCards();
      return { cardId: result.data.cardId };
    } else if (!result.ok && result.code === "CONFLICT") {
      const conflict = result as commands.ConflictFailure;
      return { existingCardId: conflict.existingCardId };
    }
    return null;
  },

  updateCard: async (input) => {
    const result = await commands.updateCard(input);
    if (result.ok) {
      await get().loadCards();
      return true;
    }
    return false;
  },

  getCard: async (cardId) => {
    set({ isLoadingCard: true });
    const result = await commands.getCard(cardId);
    if (result.ok) {
      set({ activeCard: result.data, isLoadingCard: false });
    } else {
      set({ isLoadingCard: false });
    }
  },

  deleteCard: async (cardId) => {
    const result = await commands.deleteCard(cardId);
    if (result.ok) {
      set((state) => ({ cards: state.cards.filter(c => c.id !== cardId) }));
      return true;
    }
    return false;
  },

  clearActiveCard: () => set({ activeCard: null }),
});
