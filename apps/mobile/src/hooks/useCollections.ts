import { useEffect } from 'react';
import { useCollectionsStore } from '../store/collectionsStore';

export type { Collection } from '../store/collectionsStore';

export function useCollections() {
  const { collections, loaded, load } = useCollectionsStore();
  useEffect(() => { load(); }, [load]);
  return collections;
}
