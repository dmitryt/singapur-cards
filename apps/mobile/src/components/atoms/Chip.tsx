import { Pressable, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function Chip({ label, active = false, onPress, disabled = false }: ChipProps) {
  return (
    <Pressable
      style={[styles.chip, active && styles.active, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  active: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  activeLabel: {
    color: '#fff',
  },
});
