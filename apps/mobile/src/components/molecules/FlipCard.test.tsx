import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { FlipCard } from './FlipCard';

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: ReactNode }) => children,
  Gesture: {
    Pan: () => {
      const chain = {
        enabled: () => chain,
        minDistance: () => chain,
        runOnJS: () => chain,
        onUpdate: () => chain,
        onEnd: () => chain,
        onFinalize: () => chain,
      };
      return chain;
    },
  },
}));

describe('FlipCard', () => {
  it('renders front and back content', () => {
    const { getByText } = render(
      <FlipCard
        front={<Text>front-face</Text>}
        back={<Text>back-face</Text>}
        isFlipped={false}
      />,
    );

    expect(getByText('front-face')).toBeTruthy();
    expect(getByText('back-face')).toBeTruthy();
  });
});
