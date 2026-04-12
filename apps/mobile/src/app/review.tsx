import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useReviewSession } from '../hooks/useReviewSession';
import { useActiveLanguageStore } from '../store/activeLanguageStore';
import { ReviewCard } from '../components/organisms/ReviewCard';
import { Button } from '../components/atoms/Button';
import { COLORS } from '../theme';

export default function ReviewScreen() {
  const { collectionId } = useLocalSearchParams<{ collectionId?: string }>();
  const router = useRouter();
  const activeLanguage = useActiveLanguageStore((s) => s.language);
  const session = useReviewSession(collectionId || null, activeLanguage);

  if (!session.loaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (session.isDone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.doneTitle}>Review Complete!</Text>
          <Text style={styles.doneSub}>
            {session.total} card{session.total !== 1 ? 's' : ''} reviewed
          </Text>
          <View style={styles.gap24} />
          <Button label="Back to Cards" onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session.current) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>No cards to review</Text>
          <View style={styles.gap16} />
          <Button label="Back to Cards" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>← Cards</Text>
        </Pressable>
        <Text style={styles.progress}>
          {session.currentIndex + 1} / {session.total}
        </Text>
        <View style={styles.backButton} />
      </View>
      {/* key causes remount on card change — resets flip animation instantly */}
      <ReviewCard
        key={session.current.id}
        card={session.current}
        isFlipped={session.isFlipped}
        recording={session.recording}
        onFlip={session.flip}
        onResult={session.record}
      />
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
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    minWidth: 64,
  },
  backText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  progress: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  doneSub: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  muted: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  gap16: { height: 16 },
  gap24: { height: 24 },
});
