import { fireEvent, render } from '@testing-library/react-native';
import { CardsHomeToolbar } from './CardsHomeToolbar';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

jest.mock('./NavMenu', () => ({
  NavMenu: () => null,
}));

jest.mock('./HeadwordSearchField', () => ({
  HeadwordSearchField: ({ value, onChangeText }: { value: string; onChangeText: (q: string) => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(
      Pressable,
      { onPress: () => onChangeText(`${value}-updated`) },
      React.createElement(Text, null, `search:${value}`),
    );
  },
}));

describe('CardsHomeToolbar', () => {
  it('calls search and advanced search handlers', () => {
    const onSearchChange = jest.fn();
    const onAdvancedSearchPress = jest.fn();

    const { getByText, getByLabelText } = render(
      <CardsHomeToolbar
        searchQuery="ma"
        onSearchChange={onSearchChange}
        collectionFilterActive={false}
        onAdvancedSearchPress={onAdvancedSearchPress}
      />,
    );

    fireEvent.press(getByText('search:ma'));
    fireEvent.press(getByLabelText('Advanced search'));

    expect(onSearchChange).toHaveBeenCalledWith('ma-updated');
    expect(onAdvancedSearchPress).toHaveBeenCalledTimes(1);
  });
});
