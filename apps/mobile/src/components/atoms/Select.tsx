import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../../theme';

export interface SelectOption<T extends string> {
  label: string;
  value: T | null;
}

interface SelectProps<T extends string> {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder?: string;
  /** Merged into the trigger `Pressable` (e.g. maxWidth for compact toolbars). */
  triggerStyle?: StyleProp<ViewStyle>;
}

export function Select<T extends string>({
  options,
  value,
  onChange,
  placeholder = 'All',
  triggerStyle,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  const label = selected?.label ?? placeholder;

  function handleSelect(val: T | null) {
    onChange(val);
    setOpen(false);
  }

  return (
    <>
      <Pressable style={[styles.trigger, triggerStyle]} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText} numberOfLines={1}>{label}</Text>
        <Text style={styles.caret}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <ScrollView bounces={false}>
              <Pressable style={styles.option} onPress={() => handleSelect(null)}>
                <Text style={[styles.optionText, value === null && styles.optionTextActive]}>
                  {placeholder}
                </Text>
              </Pressable>
              {options.map(opt => (
                <Pressable key={String(opt.value)} style={styles.option} onPress={() => handleSelect(opt.value as T)}>
                  <Text style={[styles.optionText, value === opt.value && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    maxWidth: 160,
  },
  triggerText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  caret: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 320,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  optionText: {
    fontSize: 15,
    color: COLORS.text,
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
