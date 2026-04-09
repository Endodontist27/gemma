import { asc, eq } from 'drizzle-orm';

import type { Summary } from '@domain/entities/Summary';
import type { SummaryRepository } from '@domain/repository-contracts/SummaryRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { summaryKindOrder } from '@infrastructure/database/ordering';
import { mapSummaryRecord, toSummaryInsert } from '@infrastructure/database/mappers';
import { summaries } from '@infrastructure/database/schema';

export class DrizzleSummaryRepository implements SummaryRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db
      .select()
      .from(summaries)
      .where(eq(summaries.sessionId, sessionId))
      .orderBy(summaryKindOrder, asc(summaries.title), asc(summaries.id));

    return rows.map(mapSummaryRecord);
  }

  async saveMany(summaryItems: Summary[]) {
    if (!summaryItems.length) {
      return;
    }

    await this.db.insert(summaries).values(summaryItems.map(toSummaryInsert)).run();
  }
}
