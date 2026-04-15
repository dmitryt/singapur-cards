import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { Platform } from 'react-native';
import * as schema from './schema';

const DATABASE_NAME = 'singapur_cards_mobile.db';

/**
 * Optional dev-only SQLite parent directory (expo-sqlite 3rd argument).
 * Set `EXPO_PUBLIC_DEV_SQLITE_DIR` before `expo start` so the DB file lives
 * under a fixed folder (e.g. repo `.data/`) and matches `npm run db:seed` /
 * `npm run db:clean` defaults — useful on iOS Simulator with
 * `npm run start:shared-db` (inlines an absolute path at bundle time).
 *
 * Physical devices cannot open a path on your Mac; omit the variable there.
 * Android emulators need a path inside the guest FS, not `$PWD` from the host.
 */
function devSqliteDirectory(): string | undefined {
  if (!__DEV__ || Platform.OS === 'web') return undefined;
  const raw = process.env.EXPO_PUBLIC_DEV_SQLITE_DIR;
  if (raw == null || typeof raw !== 'string') return undefined;
  const dir = raw.trim().replace(/\/+$/, '');
  return dir.length > 0 ? dir : undefined;
}

const devDir = devSqliteDirectory();
const expoDb = devDir
  ? SQLite.openDatabaseSync(DATABASE_NAME, {}, devDir)
  : SQLite.openDatabaseSync(DATABASE_NAME);
expoDb.execSync('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');

export const db = drizzle(expoDb, { schema });
export { expoDb };
export default db;
