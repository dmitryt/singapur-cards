import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useLanguages } from './useLanguages';
import { db } from '../db';

jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('useLanguages', () => {
  const orderBy = jest.fn();
  let api: ReturnType<typeof useLanguages> | null = null;

  function TestHarness() {
    api = useLanguages();
    return <Text>{`rows:${api.rows.length}`}</Text>;
  }

  beforeEach(() => {
    api = null;
    orderBy.mockReset();
    (db.select as jest.Mock).mockReset();
    (db.insert as jest.Mock).mockReset();
    (db.delete as jest.Mock).mockReset();
  });

  it('loads initial languages on mount', async () => {
    orderBy.mockResolvedValue([{ code: 'en', title: 'English' }]);
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({ orderBy }),
    });

    const { getByText } = render(<TestHarness />);
    await waitFor(() => expect(getByText('rows:1')).toBeTruthy());
  });

  it('rejects invalid language code', async () => {
    orderBy.mockResolvedValue([{ code: 'en', title: 'English' }]);
    (db.select as jest.Mock).mockReturnValue({
      from: () => ({ orderBy, where: () => ({ limit: () => Promise.resolve([]) }) }),
    });

    render(<TestHarness />);
    await waitFor(() => expect(api).not.toBeNull());

    const result = await api!.addLanguage('english', 'English');
    expect(result).toEqual({
      ok: false,
      message: 'Language code must be 2 letters (example: de).',
    });
  });

  it('removes a language when more than one exists', async () => {
    const where = jest.fn().mockResolvedValue(undefined);
    (db.delete as jest.Mock).mockReturnValue({ where });

    (db.select as jest.Mock).mockReturnValue({
      from: () => ({
        orderBy: jest
          .fn()
          .mockResolvedValueOnce([
            { code: 'en', title: 'English' },
            { code: 'ms', title: 'Malay' },
          ])
          .mockResolvedValueOnce([{ code: 'en', title: 'English' }]),
      }),
    });

    render(<TestHarness />);
    await waitFor(() => expect(api).not.toBeNull());

    let result: unknown = null;
    await act(async () => {
      result = await api!.removeLanguage('ms');
    });

    expect(result).toMatchObject({
      ok: true,
      removedCode: 'ms',
    });
    expect(where).toHaveBeenCalledTimes(1);
  });
});
