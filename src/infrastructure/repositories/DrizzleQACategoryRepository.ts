import { and, asc, eq } from 'drizzle-orm';

import type { QACategory } from '@domain/entities/QACategory';
import type { QACategoryRepository } from '@domain/repository-contracts/QACategoryRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapQACategoryRecord, toQACategoryInsert } from '@infrastructure/database/mappers';
import { qaCategories } from '@infrastructure/database/schema';

export class DrizzleQACategoryRepository implements QACategoryRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db
      .select()
      .from(qaCategories)
      .where(eq(qaCategories.sessionId, sessionId))
      .orderBy(asc(qaCategories.createdAt), asc(qaCategories.label), asc(qaCategories.id));

    return rows.map(mapQACategoryRecord);
  }

  async findByKey(sessionId: string, key: string) {
    const rows = await this.db
      .select()
      .from(qaCategories)
      .where(and(eq(qaCategories.sessionId, sessionId), eq(qaCategories.key, key)))
      .limit(1);
    const row = rows[0];

    return row ? mapQACategoryRecord(row) : null;
  }

  async saveMany(categories: QACategory[]) {
    if (!categories.length) {
      return;
    }

    await this.db.insert(qaCategories).values(categories.map(toQACategoryInsert)).run();
  }
}
