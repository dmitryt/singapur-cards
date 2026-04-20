import { fireEvent, render } from '@testing-library/react-native';
import { HeadwordSearchField } from './HeadwordSearchField';

describe('HeadwordSearchField', () => {
  it('calls onChangeText from input typing', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <HeadwordSearchField value="" onChangeText={onChangeText} />,
    );

    fireEvent.changeText(getByLabelText('Search headwords'), 'makan');
    expect(onChangeText).toHaveBeenCalledWith('makan');
  });

  it('shows clear button when value exists and clears text', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <HeadwordSearchField value="minum" onChangeText={onChangeText} />,
    );

    fireEvent.press(getByLabelText('Clear search'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
