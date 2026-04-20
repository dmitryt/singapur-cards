import { useCardsListFilterStore } from './cardsListFilterStore';

describe('useCardsListFilterStore', () => {
  beforeEach(() => {
    useCardsListFilterStore.setState({ activeCollectionId: null });
  });

  it('sets active collection id', () => {
    useCardsListFilterStore.getState().setActiveCollectionId('col-1');
    expect(useCardsListFilterStore.getState().activeCollectionId).toBe('col-1');
  });

  it('clears active collection id', () => {
    useCardsListFilterStore.getState().setActiveCollectionId('col-1');
    useCardsListFilterStore.getState().setActiveCollectionId(null);
    expect(useCardsListFilterStore.getState().activeCollectionId).toBeNull();
  });
});
