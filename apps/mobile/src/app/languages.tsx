import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useActiveLanguageStore } from '../store/activeLanguageStore';
import { useLanguages } from '../hooks/useLanguages';
import { COLORS } from '../theme';

export default function LanguagesScreen() {
  const router = useRouter();
  const activeLanguage = useActiveLanguageStore((s) => s.language);
  const setLanguage = useActiveLanguageStore((s) => s.setLanguage);
  const { rows, addLanguage, removeLanguage } = useLanguages();
  const [newLanguageCode, setNewLanguageCode] = useState('');
  const [newLanguageTitle, setNewLanguageTitle] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleAddLanguage() {
    setAdding(true);
    setFeedback(null);

    const result = await addLanguage(newLanguageCode, newLanguageTitle);
    if (!result.ok) {
      setFeedback(result.message);
      setAdding(false);
      return;
    }

    setNewLanguageCode('');
    setNewLanguageTitle('');
    setFeedback(`Language ${result.code.toUpperCase()} added.`);
    setAdding(false);
  }

  function handleRemoveLanguage(code: string) {
    const row = rows.find((entry) => entry.code === code);
    if (!row) return;

    if (rows.length <= 1) {
      setFeedback('At least one language must remain.');
      return;
    }

    Alert.alert(
      'Remove language?',
      `Remove "${row.title} (${row.code.toUpperCase()})"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await removeLanguage(code);
              if (!result.ok) {
                setFeedback(result.message);
                return;
              }

              if (activeLanguage === code) {
                const fallback = result.rows[0];
                if (fallback) {
                  await setLanguage(fallback.code);
                }
              }
              setFeedback(`Language ${code.toUpperCase()} removed.`);
            })();
          },
        },
      ]
    );
  }

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

      <Text style={styles.title}>Languages</Text>
      <Text style={styles.hint}>Add languages for cards and learning settings.</Text>

      <View style={styles.addLanguageBox}>
        <Text style={styles.addLanguageTitle}>Add language</Text>
        <TextInput
          style={styles.input}
          placeholder="Title (example: German)"
          placeholderTextColor={COLORS.textSecondary}
          value={newLanguageTitle}
          onChangeText={setNewLanguageTitle}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Code (example: de)"
          placeholderTextColor={COLORS.textSecondary}
          value={newLanguageCode}
          onChangeText={(value) => setNewLanguageCode(value.toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={2}
        />
        <Pressable
          style={[styles.addButton, adding && styles.addButtonDisabled]}
          onPress={() => void handleAddLanguage()}
          disabled={adding}
        >
          <Text style={styles.addButtonText}>{adding ? 'Adding...' : 'Add language'}</Text>
        </Pressable>
        {feedback && <Text style={styles.feedback}>{feedback}</Text>}
      </View>

      <Text style={styles.section}>Available languages</Text>
      <Text style={styles.hintSmall}>Minimum languages: 1</Text>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {rows.map((row) => (
          <View key={row.code} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowText}>
                {row.title} ({row.code.toUpperCase()})
              </Text>
              {row.code === activeLanguage && <Text style={styles.activeBadge}>Active</Text>}
            </View>
            <Pressable
              onPress={() => handleRemoveLanguage(row.code)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${row.title}`}
              style={[styles.removeButton, rows.length <= 1 && styles.removeButtonDisabled]}
              disabled={rows.length <= 1}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          </View>
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
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 20,
  },
  addLanguageBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  addLanguageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  addButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  feedback: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  section: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  hintSmall: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  scroll: {
    flex: 1,
  },
  row: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowMain: {
    flex: 1,
    paddingRight: 10,
  },
  rowText: {
    fontSize: 16,
    color: COLORS.text,
  },
  activeBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 12,
    color: COLORS.primary,
    backgroundColor: '#e8f4fc',
    fontWeight: '600',
  },
  removeButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9534f',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    color: '#d9534f',
    fontSize: 13,
    fontWeight: '600',
  },
});
