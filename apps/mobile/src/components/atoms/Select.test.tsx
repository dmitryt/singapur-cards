import { fireEvent, render } from '@testing-library/react-native';
import { Select } from './Select';

describe('Select', () => {
  const options = [
    { label: 'English', value: 'en' as const },
    { label: 'Malay', value: 'ms' as const },
  ];

  it('shows placeholder when value is null', () => {
    const { getByText } = render(
      <Select options={options} value={null} onChange={jest.fn()} placeholder="All languages" />,
    );

    expect(getByText('All languages')).toBeTruthy();
  });

  it('opens options and selects a concrete value', () => {
    const onChange = jest.fn();
    const { getByText } = render(<Select options={options} value={null} onChange={onChange} />);

    fireEvent.press(getByText('All'));
    fireEvent.press(getByText('Malay'));

    expect(onChange).toHaveBeenCalledWith('ms');
  });

  it('selects null option from sheet', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <Select options={options} value={'en'} onChange={onChange} placeholder="All" />,
    );

    fireEvent.press(getByText('English'));
    fireEvent.press(getByText('All'));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
