import { useEffect } from 'react';
import { useReviewStore } from '../store/reviewStore';

export function useReviewSession(
  collectionId: string | null | undefined,
  language: string
) {
  useEffect(() => {
    void useReviewStore.getState().load(collectionId, language);
  }, [collectionId, language]);

  const store = useReviewStore();
  const current = store.deck[store.currentIndex] ?? null;
  const isDone = store.loaded && store.currentIndex >= store.deck.length;

  return {
    current,
    isFlipped: store.isFlipped,
    isDone,
    loaded: store.loaded,
    total: store.deck.length,
    currentIndex: store.currentIndex,
    recording: store.recording,
    flip: store.flip,
    record: store.record,
  };
}
