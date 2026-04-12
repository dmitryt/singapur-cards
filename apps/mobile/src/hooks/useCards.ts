import { useEffect } from 'react';
import { useCardsStore } from '../store/cardsStore';

export type { Card } from '../store/cardsStore';

export function useCards(collectionId?: string | null) {
  const { cards, load } = useCardsStore();
  useEffect(() => { load(collectionId); }, [collectionId, load]);
  return cards;
}
