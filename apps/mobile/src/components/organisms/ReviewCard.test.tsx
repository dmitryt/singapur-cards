import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ReviewCard } from './ReviewCard';

jest.mock('../molecules/FlipCard', () => ({
  FlipCard: ({ front, back, backgroundColor }: { front: ReactNode; back: ReactNode; backgroundColor: string }) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, `bg:${backgroundColor}`),
      front,
      back,
    );
  },
}));

describe('ReviewCard', () => {
  const baseCard = {
    id: 'card-1',
    language: 'en',
    headword: 'Makan',
    answerText: '[b]to eat[/b]',
    exampleText: 'I makan nasi lemak.',
    notes: null,
    learningStatus: 'learned',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastReviewedAt: null,
  } as const;

  it('renders headword, parsed answer, and example on card content', () => {
    const { getByText } = render(
      <ReviewCard
        card={baseCard}
        isFlipped={false}
        recording={false}
        onFlip={jest.fn()}
        onResult={jest.fn()}
      />,
    );

    expect(getByText('Makan')).toBeTruthy();
    expect(getByText('to eat')).toBeTruthy();
    expect(getByText('I makan nasi lemak.')).toBeTruthy();
  });

  it('shows swipe hint when card is flipped', () => {
    const { getByText } = render(
      <ReviewCard
        card={baseCard}
        isFlipped
        recording={false}
        onFlip={jest.fn()}
        onResult={jest.fn()}
      />,
    );

    expect(getByText('← Not Learned · Learned →')).toBeTruthy();
  });
});
