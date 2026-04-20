import { fireEvent, render } from '@testing-library/react-native';
import HomeScreen from './index';
import { useRouter } from 'expo-router';
import { useCards } from '../../hooks/useCards';
import { useCardsListFilterStore } from '../../store/cardsListFilterStore';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../hooks/useCards', () => ({
  useCards: jest.fn(),
}));

jest.mock('../../store/activeLanguageStore', () => ({
  useActiveLanguageStore: (selector: (state: { language: string }) => string) =>
    selector({ language: 'en' }),
}));

jest.mock('../../store/cardsListFilterStore', () => ({
  useCardsListFilterStore: jest.fn(),
}));

jest.mock('../../components/molecules/CardsHomeToolbar', () => ({
  CardsHomeToolbar: () => null,
}));

jest.mock('../../components/molecules/AdvancedSearchModal', () => ({
  AdvancedSearchModal: () => null,
}));

jest.mock('../../components/organisms/CardList', () => ({
  CardList: ({ cards, onCardPress }: { cards: Array<{ id: string; headword: string }>; onCardPress: (card: { id: string; headword: string }) => void }) => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');
    return React.createElement(
      View,
      null,
      cards.map((card) =>
        React.createElement(
          Pressable,
          { key: card.id, onPress: () => onCardPress(card) },
          React.createElement(Text, null, card.headword),
        ),
      ),
    );
  },
}));

jest.mock('../../components/atoms/Button', () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(Pressable, { onPress }, React.createElement(Text, null, label));
  },
}));

describe('HomeScreen', () => {
  const push = jest.fn();

  beforeEach(() => {
    push.mockReset();
    (useRouter as jest.Mock).mockReturnValue({ push });
    (useCards as jest.Mock).mockReturnValue([
      {
        id: 'card-2',
        headword: 'Zeta',
        answerText: 'z',
        language: 'en',
        learningStatus: 'unreviewed',
      },
      {
        id: 'card-1',
        headword: 'Alpha',
        answerText: 'a',
        language: 'en',
        learningStatus: 'learned',
      },
    ]);
  });

  it('starts review without collection id when no filter is active', () => {
    (useCardsListFilterStore as jest.Mock).mockImplementation((selector: (state: { activeCollectionId: string | null }) => unknown) =>
      selector({ activeCollectionId: null }),
    );

    const { getByText } = render(<HomeScreen />);
    fireEvent.press(getByText('Practice'));

    expect(push).toHaveBeenCalledWith('/review');
  });

  it('starts review with selected collection id and routes to card details', () => {
    (useCardsListFilterStore as jest.Mock).mockImplementation((selector: (state: { activeCollectionId: string | null }) => unknown) =>
      selector({ activeCollectionId: 'col-99' }),
    );

    const { getByText } = render(<HomeScreen />);
    fireEvent.press(getByText('Practice'));
    fireEvent.press(getByText('Alpha'));

    expect(push).toHaveBeenCalledWith('/review?collectionId=col-99');
    expect(push).toHaveBeenCalledWith('/cards/card-1');
  });
});
