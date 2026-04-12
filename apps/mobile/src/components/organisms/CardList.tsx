import { FlatList, StyleSheet, Text, View } from 'react-native';
import { CardListItem } from '../molecules/CardListItem';
import { COLORS } from '../../theme';
import type { Card } from '../../hooks/useCards';

interface CardListProps {
  cards: Card[];
  onCardPress: (card: Card) => void;
}

export function CardList({ cards, onCardPress }: CardListProps) {
  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No cards to show</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cards}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <CardListItem card={item} onPress={() => onCardPress(item)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
