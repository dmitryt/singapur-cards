import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCards } from '../../hooks/useCards';
import { AdvancedSearchModal } from '../../components/molecules/AdvancedSearchModal';
import { CardsHomeToolbar } from '../../components/molecules/CardsHomeToolbar';
import { CardList } from '../../components/organisms/CardList';
import { Button } from '../../components/atoms/Button';
import { COLORS } from '../../theme';
import { useActiveLanguageStore } from '../../store/activeLanguageStore';
import { useCardsListFilterStore } from '../../store/cardsListFilterStore';
import type { Card } from '../../hooks/useCards';

export default function HomeScreen() {
  const router = useRouter();
  const activeCollectionId = useCardsListFilterStore((s) => s.activeCollectionId);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const activeLanguage = useActiveLanguageStore((s) => s.language);
  const cards = useCards(activeCollectionId, activeLanguage);

  const visibleCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q ? cards.filter((c) => c.headword.toLowerCase().startsWith(q)) : cards;
    return [...filtered].sort((a, b) => a.headword.localeCompare(b.headword));
  }, [cards, searchQuery]);

  const emptyMessage = useMemo(() => {
    if (cards.length === 0) return 'No cards to show';
    if (searchQuery.trim()) return 'No cards match your search';
    return 'No cards to show';
  }, [cards.length, searchQuery]);

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
      <CardsHomeToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        collectionFilterActive={activeCollectionId !== null}
        onAdvancedSearchPress={() => setAdvancedSearchOpen(true)}
      />
      <View style={styles.list}>
        <CardList
          cards={visibleCards}
          onCardPress={handleCardPress}
          emptyMessage={emptyMessage}
        />
      </View>
      <View style={styles.footer}>
        <Button
          label="Practice"
          icon={<Ionicons name="school" size={18} color="#fff" />}
          onPress={handleStartReview}
          disabled={visibleCards.length === 0}
        />
      </View>
      <AdvancedSearchModal
        visible={advancedSearchOpen}
        onClose={() => setAdvancedSearchOpen(false)}
        activeLanguageCode={activeLanguage}
        onLanguageChipPress={() => {
          setAdvancedSearchOpen(false);
          router.push('/settings');
        }}
      />
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
});
