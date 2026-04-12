import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useActiveLanguageStore } from '../store/activeLanguageStore';
import { useLanguages } from '../hooks/useLanguages';
import { COLORS } from '../theme';

export default function SettingsScreen() {
  const router = useRouter();
  const language = useActiveLanguageStore((s) => s.language);
  const setLanguage = useActiveLanguageStore((s) => s.setLanguage);
  const languageRows = useLanguages();

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backRow}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.section}>Learning language</Text>
      <Text style={styles.hint}>Cards and review use this language.</Text>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {languageRows.map((row) => (
          <Pressable
            key={row.code}
            style={[styles.option, row.code === language && styles.optionActive]}
            onPress={() => void setLanguage(row.code)}
          >
            <Text style={[styles.optionText, row.code === language && styles.optionTextActive]}>
              {row.title} ({row.code.toUpperCase()})
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  section: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
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
