import { useMemo } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';
import type { Card } from '../../hooks/useCards';
import { dslToPlainText } from '../../lib/dslToHtml';

const STATUS_BORDER: Record<string, string> = {
  learned:     '#21ba45',
  not_learned: '#db2828',
  unreviewed:  'transparent',
};

interface CardListItemProps {
  card: Card;
  onPress?: () => void;
}

export function CardListItem({ card, onPress }: CardListItemProps) {
  const borderColor = STATUS_BORDER[card.learningStatus] ?? 'transparent';
  const parsedAnswerText = useMemo(() => dslToPlainText(card.answerText), [card.answerText]);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.statusBar, { backgroundColor: borderColor }]} />
      <View style={styles.body}>
        <Text style={styles.headword} numberOfLines={2}>{card.headword}</Text>
        <Text style={styles.answer} numberOfLines={2}>{parsedAnswerText}</Text>
        <View style={styles.actions}>
          <View style={styles.audioBtn}>
            <Ionicons name="volume-medium" size={14} color={COLORS.textSecondary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
    minHeight: 120,
  },
  statusBar: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  headword: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  answer: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  audioBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
