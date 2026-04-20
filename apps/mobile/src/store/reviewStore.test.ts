import { useReviewStore } from './reviewStore';
import { db } from '../db';

jest.mock('../db', () => ({
  db: {
    transaction: jest.fn(),
  },
}));

describe('useReviewStore', () => {
  beforeEach(() => {
    useReviewStore.setState({
      deck: [],
      currentIndex: 0,
      isFlipped: false,
      loaded: true,
      recording: false,
    });
    (db.transaction as jest.Mock).mockReset();
  });

  it('toggles flip state', () => {
    useReviewStore.getState().flip();
    expect(useReviewStore.getState().isFlipped).toBe(true);

    useReviewStore.getState().flip();
    expect(useReviewStore.getState().isFlipped).toBe(false);
  });

  it('optimistically updates result and advances card index after recording', async () => {
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((callback: TimerHandler) => {
        if (typeof callback === 'function') callback();
        return 0 as unknown as NodeJS.Timeout;
      }) as typeof setTimeout);

    const tx = {
      insert: jest.fn(() => ({ values: jest.fn().mockResolvedValue(undefined) })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(undefined),
        })),
      })),
    };

    (db.transaction as jest.Mock).mockImplementation(async (callback) => callback(tx));

    useReviewStore.setState({
      deck: [
        {
          id: 'card-1',
          language: 'en',
          headword: 'Makan',
          answerText: 'to eat',
          exampleText: null,
          notes: null,
          learningStatus: 'unreviewed',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          lastReviewedAt: null,
        },
      ] as never,
      currentIndex: 0,
      isFlipped: true,
      loaded: true,
      recording: false,
    });

    const promise = useReviewStore.getState().record('learned');

    expect(useReviewStore.getState().recording).toBe(true);
    expect(useReviewStore.getState().deck[0]?.learningStatus).toBe('learned');

    await promise;

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(useReviewStore.getState().currentIndex).toBe(1);
    expect(useReviewStore.getState().isFlipped).toBe(false);
    expect(useReviewStore.getState().recording).toBe(false);

    setTimeoutSpy.mockRestore();
  });
});
