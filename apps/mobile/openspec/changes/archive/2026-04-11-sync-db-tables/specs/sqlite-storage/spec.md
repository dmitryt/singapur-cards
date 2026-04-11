## MODIFIED Requirements

### Requirement: Migration runner applies schema migrations on startup
The app SHALL run Drizzle's migration runner on database initialization that tracks applied migrations in a `__drizzle_migrations` table and applies any pending SQL migration files in order. The migration set SHALL include at minimum the baseline migration (canonical schema tables).

#### Scenario: Migrations table is created on first launch
- **WHEN** the app is launched for the first time on a device
- **THEN** a `__drizzle_migrations` table exists in the SQLite database after initialization

#### Scenario: Pending migrations are applied in order
- **WHEN** the database has N applied migrations and M new migration files are defined (M > N)
- **THEN** migrations N+1 through M are applied sequentially and recorded in `__drizzle_migrations`

#### Scenario: Already-applied migrations are skipped
- **WHEN** the app is restarted on a device that already has migrations applied
- **THEN** no migration is applied twice and the `__drizzle_migrations` table row count does not increase

#### Scenario: Migration failure halts startup
- **WHEN** a migration SQL statement throws an error
- **THEN** the migration runner surfaces the error and the app does not silently continue with a partially migrated schema

#### Scenario: v2 migration creates canonical tables
- **WHEN** the app is launched on a device where only v1 has been applied
- **THEN** migration v2 is applied and all canonical tables exist in the database
