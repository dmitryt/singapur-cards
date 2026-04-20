import { fireEvent, render } from '@testing-library/react-native';
import { CardListItem } from './CardListItem';

describe('CardListItem', () => {
  it('renders headword and parsed plain-text answer', () => {
    const card = {
      id: 'card-1',
      language: 'en',
      headword: 'Makan',
      answerText: '[b]to eat[/b]\n[c red]daily[/c]',
      exampleText: null,
      notes: null,
      learningStatus: 'learned',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      lastReviewedAt: null,
    } as const;

    const { getByText } = render(<CardListItem card={card} />);

    expect(getByText('Makan')).toBeTruthy();
    expect(getByText('to eat\ndaily')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const card = {
      id: 'card-2',
      language: 'en',
      headword: 'Minum',
      answerText: 'to drink',
      exampleText: null,
      notes: null,
      learningStatus: 'unreviewed',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      lastReviewedAt: null,
    } as const;

    const { getByText } = render(<CardListItem card={card} onPress={onPress} />);

    fireEvent.press(getByText('Minum'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
