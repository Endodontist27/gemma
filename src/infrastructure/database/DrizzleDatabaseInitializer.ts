import type { SQLiteDatabase } from 'expo-sqlite';

import type { DatabaseInitializer } from '@application/ports/DatabaseInitializer';
import { runAppMigrations } from '@infrastructure/database/migrations/runAppMigrations';

export class DrizzleDatabaseInitializer implements DatabaseInitializer {
  constructor(private readonly sqlite: SQLiteDatabase) {}

  async initialize() {
    runAppMigrations(this.sqlite);
  }
}
