import { Text, View, StyleSheet } from 'react-native';
import { FlipCard } from '../molecules/FlipCard';
import { Badge } from '../atoms/Badge';
import { STATUS_COLORS, STATUS_BADGE, COLORS } from '../../theme';
import type { Card } from '../../hooks/useCards';

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

  const front = (
    <View style={styles.face}>
      <Text style={styles.headword}>{card.headword}</Text>
      <Badge label={card.language.toUpperCase()} backgroundColor={COLORS.primary} textColor="#fff" />
    </View>
  );

  const back = (
    <View style={styles.face}>
      <Text style={styles.answer}>{card.answerText}</Text>
      {card.exampleText ? (
        <Text style={styles.example}>{card.exampleText}</Text>
      ) : null}
    </View>
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
    gap: 12,
  },
  headword: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  answer: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
  },
  example: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
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
