import { useCardsStore } from './cardsStore';
import { db } from '../db';

jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
  },
}));

describe('useCardsStore', () => {
  beforeEach(() => {
    useCardsStore.setState({
      cards: [],
      collectionId: null,
      language: null,
    });
    (db.select as jest.Mock).mockReset();
  });

  it('loads language-scoped cards without collection filter', async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () =>
          Promise.resolve([
            {
              id: 'card-1',
              headword: 'Makan',
              answerText: 'to eat',
              language: 'en',
              learningStatus: 'unreviewed',
            },
          ]),
      }),
    });

    await useCardsStore.getState().load(null, 'en');

    const state = useCardsStore.getState();
    expect(state.cards).toHaveLength(1);
    expect(state.collectionId).toBeNull();
    expect(state.language).toBe('en');
  });

  it('loads cards with collection filter', async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          where: () =>
            Promise.resolve([
              {
                id: 'card-2',
                headword: 'Minum',
                answerText: 'to drink',
                language: 'en',
                learningStatus: 'learned',
              },
            ]),
        }),
      }),
    });

    await useCardsStore.getState().load('col-1', 'en');

    const state = useCardsStore.getState();
    expect(state.cards).toHaveLength(1);
    expect(state.collectionId).toBe('col-1');
    expect(state.language).toBe('en');
  });

  it('falls back to empty cards on query failure', async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => Promise.reject(new Error('query failed')),
      }),
    });

    await useCardsStore.getState().load(null, 'en');

    const state = useCardsStore.getState();
    expect(state.cards).toEqual([]);
    expect(state.language).toBe('en');
  });
});
