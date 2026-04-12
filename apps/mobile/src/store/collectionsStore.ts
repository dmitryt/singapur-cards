import { create } from 'zustand';
import { db } from '../db';
import { collections } from '../db/schema';

export type Collection = typeof collections.$inferSelect;

type CollectionsState = {
  collections: Collection[];
  loaded: boolean;
  load: () => Promise<void>;
};

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const result = await db.select().from(collections);
      set({ collections: result, loaded: true });
    } catch {
      set({ collections: [], loaded: true });
    }
  },
}));
