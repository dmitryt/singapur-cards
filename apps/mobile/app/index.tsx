import { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCards } from '../src/hooks/useCards';
import { useCollections } from '../src/hooks/useCollections';
import { HomeHeader } from '../src/components/molecules/HomeHeader';
import { CardList } from '../src/components/organisms/CardList';
import { Button } from '../src/components/atoms/Button';
import { COLORS } from '../src/theme';
import type { Card } from '../src/hooks/useCards';

export default function HomeScreen() {
  const router = useRouter();
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null);
  const collections = useCollections();
  const cards = useCards(activeCollectionId);

  const languages = useMemo(
    () => Array.from(new Set(cards.map(c => c.language))).sort(),
    [cards]
  );

  const visibleCards = useMemo(
    () => activeLanguage ? cards.filter(c => c.language === activeLanguage) : cards,
    [cards, activeLanguage]
  );

  function handleCardPress(card: Card) {
    router.push(`/cards/${card.id}`);
  }

  function handleStartReview() {
    if (activeCollectionId) {
      router.push(`/review?collectionId=${activeCollectionId}`);
    } else {
      router.push('/review');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader
        collections={collections}
        activeCollectionId={activeCollectionId}
        onCollectionChange={id => { setActiveCollectionId(id); setActiveLanguage(null); }}
        languages={languages}
        activeLanguage={activeLanguage}
        onLanguageChange={setActiveLanguage}
      />
      <View style={styles.list}>
        <CardList cards={visibleCards} onCardPress={handleCardPress} />
      </View>
      <View style={styles.footer}>
        <Button label="Start Review" onPress={handleStartReview} disabled={visibleCards.length === 0} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
});
