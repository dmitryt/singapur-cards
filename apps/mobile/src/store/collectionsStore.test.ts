import { useCollectionsStore } from './collectionsStore';
import { db } from '../db';

jest.mock('../db', () => ({
  db: {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    select: jest.fn(),
  },
}));

describe('useCollectionsStore', () => {
  beforeEach(() => {
    useCollectionsStore.setState({
      collections: [],
      loaded: false,
    });
    (db.insert as jest.Mock).mockReset();
    (db.update as jest.Mock).mockReset();
    (db.delete as jest.Mock).mockReset();
    (db.select as jest.Mock).mockReset();
  });

  it('creates a collection and persists it', async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    (db.insert as jest.Mock).mockReturnValue({ values });

    await useCollectionsStore.getState().create('Favorites');

    const state = useCollectionsStore.getState();
    expect(state.collections).toHaveLength(1);
    expect(state.collections[0]?.name).toBe('Favorites');
    expect(values).toHaveBeenCalledTimes(1);
  });

  it('rolls back optimistic create when db insert fails', async () => {
    const values = jest.fn().mockRejectedValue(new Error('boom'));
    (db.insert as jest.Mock).mockReturnValue({ values });
    useCollectionsStore.setState({
      collections: [
        {
          id: 'col-1',
          name: 'Existing',
          description: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      loaded: true,
    });

    await expect(useCollectionsStore.getState().create('New Collection')).rejects.toThrow(
      'Failed to create collection',
    );

    const state = useCollectionsStore.getState();
    expect(state.collections).toHaveLength(1);
    expect(state.collections[0]?.name).toBe('Existing');
  });
});
