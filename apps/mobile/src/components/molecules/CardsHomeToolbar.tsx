import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { HeadwordSearchField } from './HeadwordSearchField';
import { COLORS } from '../../theme';

interface CardsHomeToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  collectionFilterActive: boolean;
  onAdvancedSearchPress: () => void;
}

export function CardsHomeToolbar({
  searchQuery,
  onSearchChange,
  collectionFilterActive,
  onAdvancedSearchPress,
}: CardsHomeToolbarProps) {
  return (
    <View style={styles.row}>
      <HeadwordSearchField value={searchQuery} onChangeText={onSearchChange} />
      <Pressable
        style={[styles.filterButton, collectionFilterActive && styles.filterButtonActive]}
        onPress={onAdvancedSearchPress}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        accessibilityLabel="Advanced search"
        accessibilityRole="button"
        accessibilityState={{ selected: collectionFilterActive }}
      >
        <MaterialCommunityIcons
          name="filter-variant"
          size={22}
          color={collectionFilterActive ? COLORS.primary : COLORS.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterButton: {
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#e8f4fc',
  },
});
