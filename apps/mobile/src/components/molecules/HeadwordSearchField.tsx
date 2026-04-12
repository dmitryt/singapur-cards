import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../../theme';

interface HeadwordSearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function HeadwordSearchField({ value, onChangeText, style }: HeadwordSearchFieldProps) {
  const [focused, setFocused] = useState(false);
  const showClear = value.length > 0;

  return (
    <View style={[styles.wrapper, focused && styles.wrapperFocused, style]}>
      <TextInput
        style={[styles.input, showClear && styles.inputWithClear]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search headwords…"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Search headwords"
      />
      {showClear ? (
        <Pressable
          style={styles.clear}
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Text style={styles.clearIcon}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 4,
  },
  wrapperFocused: {
    borderColor: COLORS.primary,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 8,
    paddingRight: 4,
  },
  inputWithClear: {
    paddingRight: 28,
  },
  clear: {
    position: 'absolute',
    right: 6,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
