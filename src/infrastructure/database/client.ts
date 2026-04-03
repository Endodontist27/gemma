import { Platform } from 'react-native';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

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

const loadExpoSqlite = () => {
  if (Platform.OS === 'web') {
    throw new Error(
      'Lecture Companion supports iOS and Android only. The Expo SQLite runtime is intentionally disabled on web.',
    );
  }

  const runtimeRequire = Function('return require')() as NodeRequire;
  const moduleName = ['expo', 'sqlite'].join('-');
  return runtimeRequire(moduleName) as typeof import('expo-sqlite');
};

export const createDatabaseClient = (): DatabaseClient => {
  const { openDatabaseSync } = loadExpoSqlite();
  const sqlite = openDatabaseSync(appConfig.database.fileName);
  sqlite.execSync('PRAGMA foreign_keys = ON;');

  return {
    sqlite,
    drizzle: createDrizzleDatabase(sqlite),
  };
};
