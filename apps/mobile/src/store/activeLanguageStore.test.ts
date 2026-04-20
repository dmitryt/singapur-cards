import { useActiveLanguageStore, DEFAULT_ACTIVE_LANGUAGE } from './activeLanguageStore';
import { db } from '../db';

jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

describe('useActiveLanguageStore', () => {
  beforeEach(() => {
    useActiveLanguageStore.setState({
      language: DEFAULT_ACTIVE_LANGUAGE,
      hydrated: false,
    });
    (db.select as jest.Mock).mockReset();
    (db.insert as jest.Mock).mockReset();
    (db.update as jest.Mock).mockReset();
  });

  it('hydrates default value when app meta row does not exist', async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    const values = jest.fn().mockResolvedValue(undefined);
    (db.insert as jest.Mock).mockReturnValue({ values });

    await useActiveLanguageStore.getState().hydrate();

    const state = useActiveLanguageStore.getState();
    expect(state.language).toBe(DEFAULT_ACTIVE_LANGUAGE);
    expect(state.hydrated).toBe(true);
    expect(values).toHaveBeenCalledTimes(1);
  });

  it('setLanguage inserts when no app meta row exists', async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    const values = jest.fn().mockResolvedValue(undefined);
    (db.insert as jest.Mock).mockReturnValue({ values });

    await useActiveLanguageStore.getState().setLanguage('ms');

    expect(useActiveLanguageStore.getState().language).toBe('ms');
    expect(values).toHaveBeenCalledTimes(1);
  });

  it('setLanguage updates when app meta row exists', async () => {
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ key: 'active_learning_language', value: 'en' }]),
        }),
      }),
    });

    const where = jest.fn().mockResolvedValue(undefined);
    const set = jest.fn(() => ({ where }));
    (db.update as jest.Mock).mockReturnValue({ set });

    await useActiveLanguageStore.getState().setLanguage('zh');

    expect(useActiveLanguageStore.getState().language).toBe('zh');
    expect(where).toHaveBeenCalledTimes(1);
  });
});
