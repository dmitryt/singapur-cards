import { useMemo } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { FlipCard } from '../molecules/FlipCard';
import { Badge } from '../atoms/Badge';
import { STATUS_COLORS, STATUS_BADGE, COLORS } from '../../theme';
import type { Card } from '../../hooks/useCards';
import { dslToStyledSegments } from '../../lib/dslToHtml';

interface ReviewCardProps {
  card: Card;
  isFlipped: boolean;
  recording: boolean;
  onFlip: () => void;
  onResult: (result: 'learned' | 'not_learned') => void;
}

export function ReviewCard({ card, isFlipped, recording, onFlip, onResult }: ReviewCardProps) {
  const status = card.learningStatus as keyof typeof STATUS_BADGE;
  const bgColor = STATUS_COLORS[status] ?? STATUS_COLORS.unreviewed;
  const answerSegments = useMemo(
    () => dslToStyledSegments(card.answerText),
    [card.answerText],
  );

  const front = (
    <View style={styles.face}>
      <Text style={styles.headword}>{card.headword}</Text>
      <Badge label={card.language.toUpperCase()} backgroundColor={COLORS.primary} textColor="#fff" />
    </View>
  );

  const back = (
    <ScrollView
      style={styles.backScroll}
      contentContainerStyle={styles.backScrollContent}
      showsVerticalScrollIndicator
    >
      <View style={styles.backContent}>
        <Text style={styles.answer}>
          {answerSegments.map((segment, index) => (
            <Text key={`${index}-${segment.text.slice(0, 8)}`} style={segment.style}>
              {segment.text}
            </Text>
          ))}
        </Text>
        {card.exampleText ? (
          <Text style={styles.example}>{card.exampleText}</Text>
        ) : null}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <FlipCard
        front={front}
        back={back}
        isFlipped={isFlipped}
        onFlip={onFlip}
        backgroundColor={bgColor}
        onResult={onResult}
        recording={recording}
      />
      {isFlipped && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>← Not Learned · Learned →</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  backScroll: {
    alignSelf: 'stretch',
    width: '100%',
  },
  backScrollContent: {
    flexGrow: 1,
  },
  backContent: {
    alignSelf: 'stretch',
    gap: 12,
  },
  headword: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  answer: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'left',
    alignSelf: 'stretch',
    lineHeight: 24,
  },
  example: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'left',
    alignSelf: 'stretch',
    marginTop: 8,
  },
  hint: {
    alignItems: 'center',
    marginTop: 24,
  },
  hintText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
});
