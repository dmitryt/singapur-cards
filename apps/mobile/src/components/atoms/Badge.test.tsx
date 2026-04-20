import { render } from '@testing-library/react-native';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders label text', () => {
    const { getByText } = render(<Badge label="EN" />);
    expect(getByText('EN')).toBeTruthy();
  });

  it('supports custom colors', () => {
    const { getByText } = render(
      <Badge label="Learned" backgroundColor="#111111" textColor="#ffffff" />,
    );
    expect(getByText('Learned')).toBeTruthy();
  });
});
