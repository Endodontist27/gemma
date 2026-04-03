import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import type { DatabaseInitializer } from '@application/ports/DatabaseInitializer';
import type { AppDatabase } from '@infrastructure/database/client';
import { appMigrations } from '@infrastructure/database/migrations/appMigrations';

type ExpoMigrationConfig = Parameters<typeof migrate>[1];

export class DrizzleDatabaseInitializer implements DatabaseInitializer {
  constructor(private readonly db: AppDatabase) {}

  async initialize() {
    await migrate(this.db, appMigrations as unknown as ExpoMigrationConfig);
  }
}
