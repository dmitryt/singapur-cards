import { FlatList, StyleSheet, Text, View } from 'react-native';
import { CardListItem } from '../molecules/CardListItem';
import { COLORS } from '../../theme';
import type { Card } from '../../hooks/useCards';

interface CardListProps {
  cards: Card[];
  onCardPress: (card: Card) => void;
  emptyMessage?: string;
}

export function CardList({
  cards,
  onCardPress,
  emptyMessage = 'No cards to show',
}: CardListProps) {
  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cards}
      keyExtractor={item => item.id}
      numColumns={2}
      style={styles.list}
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => (
        <CardListItem card={item} onPress={() => onCardPress(item)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    padding: 10,
    gap: 10,
  },
  row: {
    gap: 10,
  },
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
