import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSyncStore } from '../store/syncStore';
import { COLORS } from '../theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString();
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function PairedView() {
  const pairedDesktop = useSyncStore((s) => s.pairedDesktop)!;
  const status = useSyncStore((s) => s.status);
  const syncing = useSyncStore((s) => s.syncing);
  const syncNow = useSyncStore((s) => s.syncNow);
  const forgetDesktop = useSyncStore((s) => s.forgetDesktop);

  function handleForget() {
    Alert.alert(
      'Forget Desktop',
      `Remove the pairing with "${pairedDesktop.displayName}"? You will need to re-pair to sync again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Forget', style: 'destructive', onPress: () => void forgetDesktop() },
      ],
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Paired with</Text>
        <Text style={styles.cardValue}>{pairedDesktop.displayName}</Text>
        <Text style={styles.cardMeta}>
          {pairedDesktop.host}:{pairedDesktop.port}
        </Text>
        <Text style={styles.cardMeta}>Paired {formatDate(pairedDesktop.pairedAt)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Last sync</Text>
        <Text style={styles.cardValue}>{formatDate(status.lastSyncAt)}</Text>
        {status.lastSyncResult === 'success' && (
          <Text style={[styles.cardMeta, styles.success]}>Succeeded</Text>
        )}
        {status.lastSyncResult === 'failure' && (
          <>
            <Text style={[styles.cardMeta, styles.error]}>Failed</Text>
            {status.lastSyncError ? (
              <Text style={[styles.cardMeta, styles.error]} numberOfLines={3}>
                {status.lastSyncError}
              </Text>
            ) : null}
          </>
        )}
      </View>

      <Pressable
        style={[styles.button, syncing && styles.buttonDisabled]}
        onPress={() => void syncNow()}
        disabled={syncing}
        accessibilityRole="button"
        accessibilityLabel="Sync now"
      >
        {syncing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sync now</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.destructiveButton}
        onPress={handleForget}
        accessibilityRole="button"
        accessibilityLabel="Forget desktop"
      >
        <Text style={styles.destructiveButtonText}>Forget desktop</Text>
      </Pressable>
    </ScrollView>
  );
}

function PairingForm() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pairWithDesktop = useSyncStore((s) => s.pairWithDesktop);

  async function handlePair() {
    setError(null);
    const portNum = parseInt(port, 10);
    if (!host.trim()) { setError('Host is required.'); return; }
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) { setError('Enter a valid port (1–65535).'); return; }
    if (code.trim().length === 0) { setError('Pairing code is required.'); return; }

    setLoading(true);
    try {
      await pairWithDesktop(host.trim(), portNum, code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pairing failed. Check the details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Pair with desktop</Text>
        <Text style={styles.hint}>
          Open the desktop app, go to Settings → Desktop Sync, and tap "Start pairing". Enter the
          details shown there.
        </Text>

        <Text style={styles.label}>Host (IP address)</Text>
        <TextInput
          style={styles.input}
          value={host}
          onChangeText={setHost}
          placeholder="192.168.1.100"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
        />

        <Text style={styles.label}>Port</Text>
        <TextInput
          style={styles.input}
          value={port}
          onChangeText={setPort}
          placeholder="47821"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>6-digit pairing code</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="number-pad"
          maxLength={6}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => void handlePair()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Pair"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Pair</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SyncScreen() {
  const router = useRouter();
  const pairedDesktop = useSyncStore((s) => s.pairedDesktop);
  const hydrated = useSyncStore((s) => s.hydrated);

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

      <Text style={styles.title}>Desktop Sync</Text>

      {!hydrated ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : pairedDesktop ? (
        <PairedView />
      ) : (
        <PairingForm />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backRow: { paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  success: { color: '#21ba45' },
  error: { color: '#db2828' },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  errorText: { fontSize: 14, color: '#db2828', marginTop: 12, lineHeight: 20 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  destructiveButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#db2828',
  },
  destructiveButtonText: { color: '#db2828', fontSize: 16, fontWeight: '600' },
});
