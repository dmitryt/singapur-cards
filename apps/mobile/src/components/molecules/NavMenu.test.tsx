import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavMenu } from './NavMenu';
import { usePathname, useRouter } from 'expo-router';
import { Animated } from 'react-native';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('NavMenu', () => {
  const push = jest.fn();

  beforeEach(() => {
    push.mockReset();
    (useRouter as jest.Mock).mockReturnValue({ push });
    (usePathname as jest.Mock).mockReturnValue('/');

    jest.spyOn(Animated, 'timing').mockReturnValue({
      start: (callback?: () => void) => callback?.(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);

    jest.spyOn(Animated, 'parallel').mockReturnValue({
      start: (callback?: () => void) => callback?.(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the drawer and navigates to selected route', async () => {
    const { getByLabelText, getByText } = render(<NavMenu />);

    fireEvent.press(getByLabelText('Navigation menu'));
    fireEvent.press(getByText('Collections'));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/collections');
    });
  });
});
