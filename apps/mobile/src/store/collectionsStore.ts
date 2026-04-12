import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { collections } from '../db/schema';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export type Collection = typeof collections.$inferSelect;

type CollectionsState = {
  collections: Collection[];
  loaded: boolean;
  load: () => Promise<void>;
  create: (name: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
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

  create: async (name: string) => {
    const now = new Date().toISOString();
    const id = generateUUID();
    const newCollection: Collection = { id, name, description: null, createdAt: now, updatedAt: now };
    const prev = get().collections;
    set({ collections: [...prev, newCollection], loaded: true });
    try {
      await db.insert(collections).values(newCollection);
    } catch {
      set({ collections: prev });
      throw new Error('Failed to create collection');
    }
  },

  rename: async (id: string, name: string) => {
    const prev = get().collections;
    const now = new Date().toISOString();
    set({
      collections: prev.map((c) => (c.id === id ? { ...c, name, updatedAt: now } : c)),
      loaded: true,
    });
    try {
      await db.update(collections).set({ name, updatedAt: now }).where(eq(collections.id, id));
    } catch {
      set({ collections: prev });
      throw new Error('Failed to rename collection');
    }
  },

  remove: async (id: string) => {
    const prev = get().collections;
    set({ collections: prev.filter((c) => c.id !== id), loaded: true });
    try {
      await db.delete(collections).where(eq(collections.id, id));
    } catch {
      set({ collections: prev });
      throw new Error('Failed to delete collection');
    }
  },
}));
