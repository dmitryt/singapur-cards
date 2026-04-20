import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useCards } from './useCards';
import { useCardsStore } from '../store/cardsStore';

jest.mock('../store/cardsStore', () => ({
  useCardsStore: Object.assign(jest.fn(), {
    getState: jest.fn(),
  }),
}));

describe('useCards', () => {
  const load = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    load.mockReset();
    load.mockResolvedValue(undefined);
    (useCardsStore as unknown as jest.Mock).mockImplementation(
      (selector: (state: { cards: Array<{ id: string }> }) => unknown) =>
        selector({ cards: [{ id: 'card-1' }] }),
    );
    (useCardsStore.getState as jest.Mock).mockReturnValue({
      load,
    });
  });

  it('returns cards from store selector and triggers load effect', () => {
    function TestComponent() {
      const cards = useCards('col-1', 'en');
      return <Text>{`count:${cards.length}`}</Text>;
    }

    const { getByText } = render(<TestComponent />);
    expect(getByText('count:1')).toBeTruthy();
    expect(useCardsStore.getState).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith('col-1', 'en');
  });
});
