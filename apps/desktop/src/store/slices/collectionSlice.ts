import { StateCreator } from "zustand";
import * as commands from "../../lib/tauri/commands";
import type { CollectionListItem, CreateCollectionInput } from "../../lib/tauri/commands";

export interface CollectionState {
  collections: CollectionListItem[];
  selectedCollectionId: string | null;
  isLoadingCollections: boolean;
}

export interface CollectionActions {
  loadCollections: () => Promise<void>;
  createCollection: (input: CreateCollectionInput) => Promise<string | null>;
  renameCollection: (collectionId: string, newName: string) => Promise<boolean>;
  deleteCollection: (collectionId: string) => Promise<boolean>;
  selectCollection: (collectionId: string | null) => void;
}

export type CollectionSlice = CollectionState & CollectionActions;

export const createCollectionSlice: StateCreator<CollectionSlice> = (set, get) => ({
  collections: [],
  selectedCollectionId: null,
  isLoadingCollections: false,

  loadCollections: async () => {
    set({ isLoadingCollections: true });
    const result = await commands.listCollections();
    if (result.ok) {
      set({ collections: result.data, isLoadingCollections: false });
    } else {
      set({ isLoadingCollections: false });
    }
  },

  createCollection: async (input) => {
    const result = await commands.createCollection(input);
    if (result.ok) {
      await get().loadCollections();
      return result.data.collectionId;
    }
    return null;
  },

  renameCollection: async (collectionId, newName) => {
    const result = await commands.renameCollection(collectionId, newName);
    if (result.ok) {
      await get().loadCollections();
      return true;
    }
    return false;
  },

  deleteCollection: async (collectionId) => {
    const result = await commands.deleteCollection(collectionId);
    if (result.ok) {
      if (get().selectedCollectionId === collectionId) {
        set({ selectedCollectionId: null });
      }
      await get().loadCollections();
      return true;
    }
    return false;
  },

  selectCollection: (collectionId) => set({ selectedCollectionId: collectionId }),
});
