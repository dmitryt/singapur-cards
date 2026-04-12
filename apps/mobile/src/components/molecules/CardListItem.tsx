import { Pressable, Text, StyleSheet } from 'react-native';
import { STATUS_COLORS, COLORS } from '../../theme';
import type { Card } from '../../hooks/useCards';

interface CardListItemProps {
  card: Card;
  onPress?: () => void;
}

export function CardListItem({ card, onPress }: CardListItemProps) {
  const bgColor = STATUS_COLORS[card.learningStatus as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.unreviewed;

  return (
    <Pressable style={[styles.container, { backgroundColor: bgColor }]} onPress={onPress}>
      <Text style={styles.headword} numberOfLines={1}>{card.headword}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headword: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
});
