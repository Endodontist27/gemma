import type { SQLiteDatabase } from 'expo-sqlite';

import { appMigrations } from '@infrastructure/database/migrations/appMigrations';

interface MigrationRow {
  created_at: number | string | null;
}

interface ParsedMigration {
  createdAt: number;
  hash: string;
  sqlStatements: string[];
}

const migrationsTableName = '__drizzle_migrations';

const createMigrationsTableSql = `
  CREATE TABLE IF NOT EXISTS ${migrationsTableName} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash text NOT NULL,
    created_at numeric
  )
`;

const parseMigrations = (): ParsedMigration[] =>
  appMigrations.journal.entries.map((entry) => {
    const key =
      `m${entry.idx.toString().padStart(4, '0')}` as keyof typeof appMigrations.migrations;
    const migrationSql = appMigrations.migrations[key];

    if (!migrationSql) {
      throw new Error(`Missing migration payload for ${entry.tag}.`);
    }

    return {
      createdAt: entry.when,
      hash: '',
      sqlStatements: migrationSql
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean),
    };
  });

export const runAppMigrations = (sqlite: SQLiteDatabase): void => {
  sqlite.execSync(createMigrationsTableSql);

  const lastAppliedMigration = sqlite.getFirstSync<MigrationRow>(
    `SELECT created_at FROM ${migrationsTableName} ORDER BY created_at DESC LIMIT 1`,
  );
  const lastAppliedCreatedAt = Number(lastAppliedMigration?.created_at ?? 0);
  const pendingMigrations = parseMigrations().filter(
    (migration) => migration.createdAt > lastAppliedCreatedAt,
  );

  if (!pendingMigrations.length) {
    return;
  }

  sqlite.withTransactionSync(() => {
    for (const migration of pendingMigrations) {
      for (const statement of migration.sqlStatements) {
        sqlite.execSync(statement);
      }

      sqlite.runSync(
        `INSERT INTO ${migrationsTableName} (hash, created_at) VALUES (?, ?)`,
        migration.hash,
        migration.createdAt,
      );
    }
  });
};
