import { useEffect } from 'react';
import { useCardsStore } from '../store/cardsStore';

export type { Card } from '../store/cardsStore';

export function useCards(collectionId: string | null | undefined, language: string) {
  const cards = useCardsStore((s) => s.cards);
  useEffect(() => {
    void useCardsStore.getState().load(collectionId, language);
  }, [collectionId, language]);
  return cards;
}
