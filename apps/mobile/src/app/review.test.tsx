import { render } from '@testing-library/react-native';
import ReviewScreen from './review';
import { useReviewSession } from '../hooks/useReviewSession';
import { useLocalSearchParams, useRouter } from 'expo-router';

jest.mock('../hooks/useReviewSession', () => ({
  useReviewSession: jest.fn(),
}));

jest.mock('../store/activeLanguageStore', () => ({
  useActiveLanguageStore: (selector: (state: { language: string }) => string) =>
    selector({ language: 'en' }),
}));

jest.mock('../components/organisms/ReviewCard', () => ({
  ReviewCard: ({ card }: { card: { headword: string } }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `review-card:${card.headword}`);
  },
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

describe('ReviewScreen route behavior', () => {
  const replace = jest.fn();
  const back = jest.fn();

  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ collectionId: 'col-1' });
    (useRouter as jest.Mock).mockReturnValue({ replace, back });
    replace.mockReset();
    back.mockReset();
  });

  it('shows loading state when session has not loaded', () => {
    (useReviewSession as jest.Mock).mockReturnValue({
      loaded: false,
      isDone: false,
      current: null,
    });

    const { getByText } = render(<ReviewScreen />);
    expect(getByText('Loading…')).toBeTruthy();
  });

  it('shows completion summary when session is done', () => {
    (useReviewSession as jest.Mock).mockReturnValue({
      loaded: true,
      isDone: true,
      total: 2,
      current: null,
    });

    const { getByText } = render(<ReviewScreen />);
    expect(getByText('Review Complete!')).toBeTruthy();
    expect(getByText('2 cards reviewed')).toBeTruthy();
  });

  it('renders current review card and progress', () => {
    (useReviewSession as jest.Mock).mockReturnValue({
      loaded: true,
      isDone: false,
      current: { id: 'card-1', headword: 'Makan' },
      isFlipped: false,
      recording: false,
      currentIndex: 0,
      total: 3,
      flip: jest.fn(),
      record: jest.fn(),
    });

    const { getByText } = render(<ReviewScreen />);
    expect(getByText('1 / 3')).toBeTruthy();
    expect(getByText('review-card:Makan')).toBeTruthy();
  });
});
