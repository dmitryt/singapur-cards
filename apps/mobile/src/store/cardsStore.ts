import { create } from 'zustand';
import { and, eq, getTableColumns } from 'drizzle-orm';
import { db } from '../db';
import { cards, collectionMemberships } from '../db/schema';

export type Card = typeof cards.$inferSelect;

type CardsState = {
  cards: Card[];
  collectionId: string | null;
  language: string | null;
  load: (collectionId: string | null | undefined, language: string) => Promise<void>;
};

export const useCardsStore = create<CardsState>((set) => ({
  cards: [],
  collectionId: null,
  language: null,
  load: async (collectionId = null, language: string) => {
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
          );
      } else {
        result = await db.select().from(cards).where(eq(cards.language, language));
      }
      set({ cards: result, collectionId: collectionId ?? null, language });
    } catch {
      set({ cards: [], collectionId: collectionId ?? null, language });
    }
  },
}));
