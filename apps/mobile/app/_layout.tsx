import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '../src/db';
import migrations from '../src/db/migrations/migrations';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    migrate(db, migrations)
      .then(() => setReady(true))
      .catch((err) => {
        // Surface migration failures clearly — do not silently continue.
        throw err;
      });
  }, []);

  if (!ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}
