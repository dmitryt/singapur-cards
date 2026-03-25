import { StateCreator } from "zustand";
import * as commands from "../../lib/tauri/commands";

export interface ReviewSessionState {
  sessionCardIds: string[];
  currentIndex: number;
  isFlipped: boolean;
  sessionComplete: boolean;
  isStarting: boolean;
}

export interface ReviewSessionActions {
  startSession: (collectionId?: string) => Promise<void>;
  flipCard: () => void;
  recordResult: (cardId: string, result: "learned" | "not_learned") => Promise<void>;
  advance: () => void;
  resetSession: () => void;
}

export type ReviewSessionSlice = ReviewSessionState & ReviewSessionActions;

export const createReviewSessionSlice: StateCreator<ReviewSessionSlice> = (set, get) => ({
  sessionCardIds: [],
  currentIndex: 0,
  isFlipped: false,
  sessionComplete: false,
  isStarting: false,

  startSession: async (collectionId) => {
    set({ isStarting: true, sessionComplete: false, currentIndex: 0, isFlipped: false });
    const result = await commands.startReviewSession(collectionId);
    if (result.ok) {
      set({
        sessionCardIds: result.data.sessionCardIds,
        sessionComplete: result.data.sessionCardIds.length === 0,
        isStarting: false,
      });
    } else {
      set({ isStarting: false });
    }
  },

  flipCard: () => set((state) => ({ isFlipped: !state.isFlipped })),

  recordResult: async (cardId, result) => {
    await commands.recordReviewResult(cardId, result);
  },

  advance: () => {
    const { currentIndex, sessionCardIds } = get();
    const next = currentIndex + 1;
    if (next >= sessionCardIds.length) {
      set({ sessionComplete: true, isFlipped: false });
    } else {
      set({ currentIndex: next, isFlipped: false });
    }
  },

  resetSession: () => set({
    sessionCardIds: [],
    currentIndex: 0,
    isFlipped: false,
    sessionComplete: false,
    isStarting: false,
  }),
});
