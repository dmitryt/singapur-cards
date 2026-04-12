import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import { db } from '../../src/db';
import { cards } from '../../src/db/schema';
import { Badge } from '../../src/components/atoms/Badge';
import { Button } from '../../src/components/atoms/Button';
import { STATUS_COLORS, STATUS_BADGE, COLORS } from '../../src/theme';

type Card = typeof cards.$inferSelect;

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<Card | null | undefined>(undefined);

  useEffect(() => {
    const cardId = Array.isArray(id) ? id[0] : id;
    if (!cardId) return;
    db.select().from(cards).where(eq(cards.id, cardId)).then(rows => {
      setCard(rows[0] ?? null);
    });
  }, [id]);

  if (card === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (card === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Card not found</Text>
          <View style={styles.gap16} />
          <Button label="Back" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const status = card.learningStatus as keyof typeof STATUS_BADGE;
  const statusConfig = STATUS_BADGE[status] ?? STATUS_BADGE.unreviewed;
  const bgColor = STATUS_COLORS[status] ?? STATUS_COLORS.unreviewed;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { backgroundColor: bgColor }]}>
        <Text style={styles.headword}>{card.headword}</Text>
        <View style={styles.badges}>
          <Badge label={card.language.toUpperCase()} backgroundColor={COLORS.primary} textColor="#fff" />
          <View style={styles.gap8} />
          <Badge label={statusConfig.label} backgroundColor={statusConfig.background} textColor={statusConfig.text} />
        </View>
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Answer</Text>
        <Text style={styles.answer}>{card.answerText}</Text>
        {card.exampleText ? (
          <>
            <Text style={styles.sectionLabel}>Example</Text>
            <Text style={styles.example}>{card.exampleText}</Text>
          </>
        ) : null}
        {card.notes ? (
          <>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notes}>{card.notes}</Text>
          </>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Back to Cards" onPress={() => router.back()} variant="secondary" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    flexGrow: 1,
  },
  headword: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 16,
  },
  answer: {
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 26,
  },
  example: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  notes: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  muted: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  gap8:  { width: 8 },
  gap16: { height: 16 },
});
