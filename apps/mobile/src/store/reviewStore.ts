import { create } from 'zustand';
import { and, eq, sql, asc, getTableColumns } from 'drizzle-orm';
import { db } from '../db';
import { cards, collectionMemberships, reviewEvents } from '../db/schema';
import type { Card } from './cardsStore';

type ReviewResult = 'learned' | 'not_learned';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const statusOrder = sql<number>`CASE
  WHEN ${cards.learningStatus} = 'unreviewed'  THEN 0
  WHEN ${cards.learningStatus} = 'not_learned' THEN 1
  WHEN ${cards.learningStatus} = 'learned'     THEN 2
  ELSE 3 END`;

type ReviewState = {
  deck: Card[];
  currentIndex: number;
  isFlipped: boolean;
  loaded: boolean;
  recording: boolean;
  load: (collectionId: string | null | undefined, language: string) => Promise<void>;
  flip: () => void;
  record: (result: ReviewResult) => Promise<void>;
};

export const useReviewStore = create<ReviewState>((set, get) => ({
  deck: [],
  currentIndex: 0,
  isFlipped: false,
  loaded: false,
  recording: false,

  load: async (collectionId = null, language: string) => {
    set({ loaded: false, currentIndex: 0, isFlipped: false });
    try {
      let result: Card[];
      if (collectionId) {
        result = await db
          .select(getTableColumns(cards))
          .from(cards)
          .innerJoin(collectionMemberships, eq(collectionMemberships.cardId, cards.id))
          .where(
            and(
              eq(collectionMemberships.collectionId, collectionId),
              eq(cards.language, language)
            )
          )
          .orderBy(asc(statusOrder));
      } else {
        result = await db
          .select()
          .from(cards)
          .where(eq(cards.language, language))
          .orderBy(asc(statusOrder));
      }
      set({ deck: result, loaded: true });
    } catch {
      set({ deck: [], loaded: true });
    }
  },

  flip: () => set((s) => ({ isFlipped: !s.isFlipped })),

  record: async (result) => {
    const { deck, currentIndex, recording } = get();
    const current = deck[currentIndex] ?? null;
    if (!current || recording) return;
    set({ recording: true });

    // Optimistic update so status color changes immediately
    set({
      deck: deck.map((c, i) => (i === currentIndex ? { ...c, learningStatus: result } : c)),
    });

    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.insert(reviewEvents).values({
        id: generateId(),
        cardId: current.id,
        result,
        reviewedAt: now,
      });
      await tx
        .update(cards)
        .set({ learningStatus: result, lastReviewedAt: now, updatedAt: now })
        .where(eq(cards.id, current.id));
    });

    // Brief pause so the status color change is visible before advancing
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    set((s) => ({ currentIndex: s.currentIndex + 1, isFlipped: false, recording: false }));
  },
}));
