import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCollections } from '../../hooks/useCollections';
import { useCardsListFilterStore } from '../../store/cardsListFilterStore';
import { COLORS } from '../../theme';

interface AdvancedSearchModalProps {
  visible: boolean;
  onClose: () => void;
  activeLanguageCode: string;
  onLanguageChipPress: () => void;
}

export function AdvancedSearchModal({
  visible,
  onClose,
  activeLanguageCode,
  onLanguageChipPress,
}: AdvancedSearchModalProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const collections = useCollections();
  const activeCollectionId = useCardsListFilterStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useCardsListFilterStore((s) => s.setActiveCollectionId);

  function pickCollection(id: string | null) {
    setActiveCollectionId(id);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, styles.backdrop]}
          onPress={onClose}
          accessibilityLabel="Dismiss advanced search"
          accessibilityRole="button"
        />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                maxHeight: windowHeight * 0.88,
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Advanced search</Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityLabel="Done"
                accessibilityRole="button"
              >
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>
            <Text style={styles.section}>Learning language</Text>
            <Text style={styles.hint}>Cards and review use this language.</Text>
            <Pressable
              style={styles.langChip}
              onPress={onLanguageChipPress}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              accessibilityLabel={`Learning language ${activeLanguageCode.toUpperCase()}, open settings`}
              accessibilityRole="button"
            >
              <Text style={styles.langChipText}>{activeLanguageCode.toUpperCase()}</Text>
            </Pressable>
            <Text style={[styles.section, styles.sectionSpaced]}>Collection</Text>
            <Text style={styles.hint}>Limit which cards appear on the home list.</Text>
            <ScrollView
              style={{ maxHeight: windowHeight * 0.42 }}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <Pressable
                style={[styles.option, activeCollectionId === null && styles.optionActive]}
                onPress={() => pickCollection(null)}
              >
                <Text
                  style={[
                    styles.optionText,
                    activeCollectionId === null && styles.optionTextActive,
                  ]}
                >
                  All collections
                </Text>
              </Pressable>
              {collections.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.option,
                    c.id === activeCollectionId && styles.optionActive,
                  ]}
                  onPress={() => pickCollection(c.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      c.id === activeCollectionId && styles.optionTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingTop: 8,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  done: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  sectionSpaced: {
    marginTop: 20,
  },
  langChip: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 4,
    minWidth: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 20,
  },
  option: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#e8f4fc',
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
