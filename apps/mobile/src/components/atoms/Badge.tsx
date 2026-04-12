import { Text, View, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  backgroundColor?: string;
  textColor?: string;
}

export function Badge({ label, backgroundColor = '#d4d4d5', textColor = '#212529' }: BadgeProps) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
