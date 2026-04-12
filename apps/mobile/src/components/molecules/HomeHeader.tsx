import { StyleSheet, View } from 'react-native';
import { Select } from '../atoms/Select';
import { COLORS } from '../../theme';
import type { Collection } from '../../hooks/useCollections';
import type { SelectOption } from '../atoms/Select';

interface HomeHeaderProps {
  collections: Collection[];
  activeCollectionId: string | null;
  onCollectionChange: (id: string | null) => void;
  languages: string[];
  activeLanguage: string | null;
  onLanguageChange: (lang: string | null) => void;
}

export function HomeHeader({
  collections,
  activeCollectionId,
  onCollectionChange,
  languages,
  activeLanguage,
  onLanguageChange,
}: HomeHeaderProps) {
  const collectionOptions: SelectOption<string>[] = collections.map(c => ({
    label: c.name,
    value: c.id,
  }));

  const languageOptions: SelectOption<string>[] = languages.map(lang => ({
    label: lang.toUpperCase(),
    value: lang,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Select
          options={collectionOptions}
          value={activeCollectionId}
          onChange={onCollectionChange}
          placeholder="All Collections"
        />
      </View>
      <Select
        options={languageOptions}
        value={activeLanguage}
        onChange={onLanguageChange}
        placeholder="All Languages"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  left: {
    flex: 1,
  },
});
