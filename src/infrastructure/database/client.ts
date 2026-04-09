import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import * as schema from '@infrastructure/database/schema';
import { appConfig } from '@shared/config/appConfig';

const createDrizzleDatabase = (sqlite: SQLiteDatabase) => drizzle(sqlite, { schema });

export type AppDatabase = ReturnType<typeof createDrizzleDatabase>;
export type AppTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];
export type AppDatabaseExecutor = AppDatabase | AppTransaction;

export interface DatabaseClient {
  sqlite: SQLiteDatabase;
  drizzle: AppDatabase;
}

export const createDatabaseClient = (): DatabaseClient => {
  const sqlite = openDatabaseSync(appConfig.database.fileName);
  sqlite.execSync('PRAGMA foreign_keys = ON;');

  return {
    sqlite,
    drizzle: createDrizzleDatabase(sqlite),
  };
};
