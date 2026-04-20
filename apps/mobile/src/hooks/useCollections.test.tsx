import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useCollections } from './useCollections';
import { useCollectionsStore } from '../store/collectionsStore';

jest.mock('../store/collectionsStore', () => ({
  useCollectionsStore: jest.fn(),
}));

describe('useCollections', () => {
  const load = jest.fn();

  beforeEach(() => {
    load.mockReset();
    (useCollectionsStore as jest.Mock).mockReturnValue({
      collections: [{ id: 'col-1', name: 'Favorites' }],
      loaded: true,
      load,
    });
  });

  it('returns store collections and triggers load on mount', () => {
    function TestComponent() {
      const collections = useCollections();
      return <Text>{`collections:${collections.length}`}</Text>;
    }

    const { getByText } = render(<TestComponent />);
    expect(getByText('collections:1')).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
