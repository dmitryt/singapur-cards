import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '../db';
import migrations from '../db/migrations/migrations';
import { useActiveLanguageStore } from '../store/activeLanguageStore';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    migrate(db, migrations)
      .then(() => useActiveLanguageStore.getState().hydrate())
      .then(() => setReady(true))
      .catch((err) => {
        // Surface migration failures clearly — do not silently continue.
        throw err;
      });
  }, []);

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
