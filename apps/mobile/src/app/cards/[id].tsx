import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { and, eq } from 'drizzle-orm';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../db';
import { cards, collectionMemberships } from '../../db/schema';
import { Badge } from '../../components/atoms/Badge';
import { Button } from '../../components/atoms/Button';
import { STATUS_COLORS, STATUS_BADGE, COLORS } from '../../theme';
import { useCollectionsStore } from '../../store/collectionsStore';

type Card = typeof cards.$inferSelect;

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<Card | null | undefined>(undefined);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const collections = useCollectionsStore((s) => s.collections);
  const loadCollections = useCollectionsStore((s) => s.load);

  useEffect(() => {
    const cardId = Array.isArray(id) ? id[0] : id;
    if (!cardId) return;

    db.select().from(cards).where(eq(cards.id, cardId)).then((rows) => {
      setCard(rows[0] ?? null);
    });

    db.select({ collectionId: collectionMemberships.collectionId })
      .from(collectionMemberships)
      .where(eq(collectionMemberships.cardId, cardId))
      .then((rows) => {
        setMemberIds(new Set(rows.map((r) => r.collectionId)));
      });

    loadCollections();
  }, [id]);

  async function toggleMembership(collectionId: string) {
    const cardId = Array.isArray(id) ? id[0] : id;
    if (!cardId) return;
    const now = new Date().toISOString();

    if (memberIds.has(collectionId)) {
      setMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
      await db
        .delete(collectionMemberships)
        .where(
          and(
            eq(collectionMemberships.collectionId, collectionId),
            eq(collectionMemberships.cardId, cardId),
          ),
        );
    } else {
      setMemberIds((prev) => new Set([...prev, collectionId]));
      await db.insert(collectionMemberships).values({ collectionId, cardId, createdAt: now });
    }
  }

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

  const memberNames = collections
    .filter((c) => memberIds.has(c.id))
    .map((c) => c.name)
    .join(', ');

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

        <View style={styles.divider} />
        <TouchableOpacity style={styles.collectionsRow} onPress={() => setSheetOpen(true)}>
          <View style={styles.collectionsRowText}>
            <Text style={styles.sectionLabel}>Collections</Text>
            <Text style={styles.collectionsSubtitle} numberOfLines={1}>
              {memberNames || 'None'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Back to Cards" onPress={() => router.back()} variant="secondary" />
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSheetOpen(false)}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Collections</Text>
          {collections.length === 0 ? (
            <Text style={styles.sheetEmpty}>No collections yet.</Text>
          ) : (
            collections.map((col) => {
              const isMember = memberIds.has(col.id);
              return (
                <TouchableOpacity
                  key={col.id}
                  style={styles.sheetRow}
                  onPress={() => toggleMembership(col.id)}
                >
                  <Text style={styles.sheetRowName}>{col.name}</Text>
                  <Ionicons
                    name={isMember ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isMember ? COLORS.primary : COLORS.textSecondary}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </Modal>
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
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
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
  collectionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionsRowText: {
    flex: 1,
  },
  collectionsSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sheetEmpty: {
    fontSize: 15,
    color: COLORS.textSecondary,
    paddingVertical: 16,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  sheetRowName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  gap8:  { width: 8 },
  gap16: { height: 16 },
});
