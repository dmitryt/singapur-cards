import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = 'singapur_cards_mobile.db';

const expoDb = SQLite.openDatabaseSync(DATABASE_NAME);
expoDb.execSync('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');

export const db = drizzle(expoDb, { schema });
export { expoDb };
export default db;
