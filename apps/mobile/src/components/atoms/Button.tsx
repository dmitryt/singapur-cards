import { type ReactNode } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { COLORS } from '../../theme';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  icon?: ReactNode;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, icon }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const labelStyle = [styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel];
  return (
    <Pressable
      style={[styles.base, isPrimary ? styles.primary : styles.secondary, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon ? (
        <View style={styles.row}>
          {icon}
          <Text style={labelStyle}>{label}</Text>
        </View>
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabled: {
    opacity: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryLabel: {
    color: '#fff',
  },
  secondaryLabel: {
    color: COLORS.text,
  },
});
