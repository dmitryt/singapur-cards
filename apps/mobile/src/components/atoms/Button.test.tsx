import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button } from './Button';

describe('Button', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Save" onPress={onPress} />);

    fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Disabled" onPress={onPress} disabled />);

    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders with icon content', () => {
    const { getByText } = render(
      <Button label="Practice" icon={<Text>icon</Text>} onPress={jest.fn()} />,
    );

    expect(getByText('icon')).toBeTruthy();
    expect(getByText('Practice')).toBeTruthy();
  });
});
