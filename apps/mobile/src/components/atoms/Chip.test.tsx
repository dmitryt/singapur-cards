import { fireEvent, render } from '@testing-library/react-native';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders label', () => {
    const { getByText } = render(<Chip label="Malay" />);
    expect(getByText('Malay')).toBeTruthy();
  });

  it('calls onPress when enabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Chip label="English" onPress={onPress} />);

    fireEvent.press(getByText('English'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Chip label="Disabled Chip" onPress={onPress} disabled />);

    fireEvent.press(getByText('Disabled Chip'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
