import { create } from 'zustand';
import { eq, getTableColumns } from 'drizzle-orm';
import { db } from '../db';
import { cards, collectionMemberships } from '../db/schema';

export type Card = typeof cards.$inferSelect;

type CardsState = {
  cards: Card[];
  collectionId: string | null;
  load: (collectionId?: string | null) => Promise<void>;
};

export const useCardsStore = create<CardsState>((set) => ({
  cards: [],
  collectionId: null,
  load: async (collectionId = null) => {
    try {
      let result: Card[];
      if (collectionId) {
        result = await db
          .select(getTableColumns(cards))
          .from(cards)
          .innerJoin(collectionMemberships, eq(collectionMemberships.cardId, cards.id))
          .where(eq(collectionMemberships.collectionId, collectionId));
      } else {
        result = await db.select().from(cards);
      }
      set({ cards: result, collectionId: collectionId ?? null });
    } catch {
      set({ cards: [], collectionId: collectionId ?? null });
    }
  },
}));
