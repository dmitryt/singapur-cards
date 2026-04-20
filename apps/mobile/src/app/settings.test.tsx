import { fireEvent, render } from '@testing-library/react-native';
import SettingsScreen from './settings';
import { useRouter } from 'expo-router';
import { useActiveLanguageStore } from '../store/activeLanguageStore';
import { useLanguages } from '../hooks/useLanguages';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../store/activeLanguageStore', () => ({
  useActiveLanguageStore: jest.fn(),
}));

jest.mock('../hooks/useLanguages', () => ({
  useLanguages: jest.fn(),
}));

describe('SettingsScreen', () => {
  const back = jest.fn();
  const push = jest.fn();
  const setLanguage = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    back.mockReset();
    push.mockReset();
    setLanguage.mockReset();
    setLanguage.mockResolvedValue(undefined);

    (useRouter as jest.Mock).mockReturnValue({ back, push });

    (useActiveLanguageStore as jest.Mock).mockImplementation(
      (selector: (state: { language: string; setLanguage: (code: string) => Promise<void> }) => unknown) =>
        selector({ language: 'en', setLanguage }),
    );

    (useLanguages as jest.Mock).mockReturnValue({
      rows: [
        { code: 'en', title: 'English' },
        { code: 'ms', title: 'Malay' },
      ],
    });
  });

  it('navigates to sync and languages screens', () => {
    const { getAllByText, getByText } = render(<SettingsScreen />);

    fireEvent.press(getAllByText('Desktop Sync')[1]!);
    fireEvent.press(getByText('Manage Languages'));

    expect(push).toHaveBeenCalledWith('/sync');
    expect(push).toHaveBeenCalledWith('/languages');
  });

  it('goes back and changes active language', () => {
    const { getByText } = render(<SettingsScreen />);

    fireEvent.press(getByText('← Back'));
    fireEvent.press(getByText('Malay (MS)'));

    expect(back).toHaveBeenCalledTimes(1);
    expect(setLanguage).toHaveBeenCalledWith('ms');
  });
});
