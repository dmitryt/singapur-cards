import { render } from '@testing-library/react-native';
import { CardList } from './CardList';

jest.mock('../molecules/CardListItem', () => ({
  CardListItem: ({ card }: { card: { headword: string } }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `item:${card.headword}`);
  },
}));

describe('CardList', () => {
  it('shows empty message when there are no cards', () => {
    const { getByText } = render(
      <CardList cards={[]} onCardPress={jest.fn()} emptyMessage="Nothing here" />,
    );

    expect(getByText('Nothing here')).toBeTruthy();
  });

  it('renders list items when cards are provided', () => {
    const { getByText } = render(
      <CardList
        cards={[
          {
            id: 'card-1',
            headword: 'Alpha',
            answerText: 'a',
            language: 'en',
            learningStatus: 'learned',
          },
        ] as never}
        onCardPress={jest.fn()}
      />,
    );

    expect(getByText('item:Alpha')).toBeTruthy();
  });
});
