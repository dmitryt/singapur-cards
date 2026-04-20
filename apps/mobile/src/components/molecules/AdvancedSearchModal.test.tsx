import { fireEvent, render } from '@testing-library/react-native';
import { AdvancedSearchModal } from './AdvancedSearchModal';
import { useCollections } from '../../hooks/useCollections';
import { useCardsListFilterStore } from '../../store/cardsListFilterStore';

jest.mock('../../hooks/useCollections', () => ({
  useCollections: jest.fn(),
}));

jest.mock('../../store/cardsListFilterStore', () => ({
  useCardsListFilterStore: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('AdvancedSearchModal', () => {
  const onClose = jest.fn();
  const onLanguageChipPress = jest.fn();
  const setActiveCollectionId = jest.fn();

  beforeEach(() => {
    onClose.mockReset();
    onLanguageChipPress.mockReset();
    setActiveCollectionId.mockReset();

    (useCollections as jest.Mock).mockReturnValue([
      { id: 'col-1', name: 'Favorites' },
      { id: 'col-2', name: 'Travel' },
    ]);

    (useCardsListFilterStore as jest.Mock).mockImplementation(
      (selector: (state: { activeCollectionId: string | null; setActiveCollectionId: (id: string | null) => void }) => unknown) =>
        selector({ activeCollectionId: 'col-1', setActiveCollectionId }),
    );
  });

  it('renders sections and triggers close/language handlers', () => {
    const { getByText, getByLabelText } = render(
      <AdvancedSearchModal
        visible
        onClose={onClose}
        activeLanguageCode="en"
        onLanguageChipPress={onLanguageChipPress}
      />,
    );

    expect(getByText('Advanced search')).toBeTruthy();
    expect(getByText('Collection')).toBeTruthy();
    fireEvent.press(getByLabelText('Done'));
    fireEvent.press(getByText('EN'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onLanguageChipPress).toHaveBeenCalledTimes(1);
  });

  it('updates collection filter when selecting options', () => {
    const { getByText } = render(
      <AdvancedSearchModal
        visible
        onClose={onClose}
        activeLanguageCode="en"
        onLanguageChipPress={onLanguageChipPress}
      />,
    );

    fireEvent.press(getByText('All collections'));
    fireEvent.press(getByText('Travel'));

    expect(setActiveCollectionId).toHaveBeenCalledWith(null);
    expect(setActiveCollectionId).toHaveBeenCalledWith('col-2');
  });
});
