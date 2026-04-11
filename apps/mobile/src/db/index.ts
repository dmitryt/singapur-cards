import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'singapur.db';

const db = SQLite.openDatabaseSync(DATABASE_NAME);

export default db;
