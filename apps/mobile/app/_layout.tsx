import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import db from '../src/db';
import { runMigrations } from '../src/db/migrate';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    runMigrations(db)
      .then(() => setReady(true))
      .catch((err) => {
        // Surface migration failures clearly — do not silently continue.
        throw err;
      });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Slot />;
}
