## ADDED Requirements

### Requirement: SQLite database is accessible via a singleton module
The app SHALL expose a single `src/db/index.ts` module that opens the SQLite database once and exports the database instance. All other modules SHALL import the database from this module and MUST NOT import `expo-sqlite` directly.

#### Scenario: Database module initializes successfully
- **WHEN** the app starts and `src/db/index.ts` is imported
- **THEN** the SQLite database file is created on-device and the exported instance is non-null

#### Scenario: Multiple imports share one connection
- **WHEN** two different modules import from `src/db/index.ts`
- **THEN** both receive the same database instance (reference equality)

### Requirement: Migration runner applies schema migrations on startup
The app SHALL run a migration runner on database initialization that tracks applied migrations in a `_migrations` table and applies any pending migrations in order.

#### Scenario: Migrations table is created on first launch
- **WHEN** the app is launched for the first time on a device
- **THEN** a `_migrations` table exists in the SQLite database after initialization

#### Scenario: Pending migrations are applied in order
- **WHEN** the database has N applied migrations and M new migrations are defined (M > N)
- **THEN** migrations N+1 through M are applied sequentially and recorded in `_migrations`

#### Scenario: Already-applied migrations are skipped
- **WHEN** the app is restarted on a device that already has migrations applied
- **THEN** no migration is applied twice and the `_migrations` table row count does not increase

#### Scenario: Migration failure halts startup
- **WHEN** a migration SQL statement throws an error
- **THEN** the migration runner surfaces the error and the app does not silently continue with a partially migrated schema
