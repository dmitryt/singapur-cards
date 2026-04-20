import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SyncScreen from './sync';
import { useRouter } from 'expo-router';
import { useSyncStore } from '../store/syncStore';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../store/syncStore', () => ({
  useSyncStore: jest.fn(),
}));

describe('SyncScreen', () => {
  const back = jest.fn();
  const pairWithDesktop = jest.fn();

  beforeEach(() => {
    back.mockReset();
    pairWithDesktop.mockReset();
    (useRouter as jest.Mock).mockReturnValue({ back });
  });

  it('shows loading indicator state when store is not hydrated', () => {
    (useSyncStore as jest.Mock).mockImplementation((selector: (state: any) => unknown) =>
      selector({
        pairedDesktop: null,
        hydrated: false,
        firstSuccessfulSyncAt: null,
        pairWithDesktop,
      }),
    );

    const { getByText } = render(<SyncScreen />);
    expect(getByText('Desktop Sync')).toBeTruthy();
  });

  it('renders pairing form and validates pair action', async () => {
    (useSyncStore as jest.Mock).mockImplementation((selector: (state: any) => unknown) =>
      selector({
        pairedDesktop: null,
        hydrated: true,
        firstSuccessfulSyncAt: null,
        pairWithDesktop,
      }),
    );

    const { getByText, getByPlaceholderText } = render(<SyncScreen />);
    fireEvent.changeText(getByPlaceholderText('192.168.1.100:47821'), 'localhost:47821');
    fireEvent.changeText(getByPlaceholderText('123456'), '654321');
    fireEvent.press(getByText('Pair'));

    await waitFor(() => {
      expect(pairWithDesktop).toHaveBeenCalledWith('localhost', 47821, '654321');
    });
  });

  it('shows paired view and allows going back', () => {
    (useSyncStore as jest.Mock).mockImplementation((selector: (state: any) => unknown) =>
      selector({
        pairedDesktop: {
          id: 'desktop-1',
          displayName: 'Desktop',
          host: '127.0.0.1',
          port: 47821,
          pairedAt: new Date().toISOString(),
          lastSyncAt: null,
        },
        hydrated: true,
        firstSuccessfulSyncAt: new Date().toISOString(),
        status: { lastSyncAt: null, lastSyncResult: null, lastSyncError: null },
        syncing: false,
        syncNow: jest.fn(),
        forgetDesktop: jest.fn(),
      }),
    );

    const { getByText } = render(<SyncScreen />);
    fireEvent.press(getByText('← Back'));

    expect(getByText('Paired with')).toBeTruthy();
    expect(back).toHaveBeenCalledTimes(1);
  });
});
