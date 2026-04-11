import { type SQLiteDatabase } from 'expo-sqlite';

// Append-only list of SQL migrations.
// Each entry is applied exactly once, in order, tracked by index in _migrations.
const MIGRATIONS: string[] = [
  // v1: schema foundation
  `CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT
  )`,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Ensure the migrations tracking table exists.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version   INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const row = await db.getFirstAsync<{ max_version: number | null }>(
    'SELECT MAX(version) AS max_version FROM _migrations'
  );
  const applied = row?.max_version ?? -1;

  for (let i = applied + 1; i < MIGRATIONS.length; i++) {
    const sql = MIGRATIONS[i];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.runAsync('INSERT INTO _migrations (version) VALUES (?)', i);
    });
  }
}
