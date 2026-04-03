import { asc, desc, eq, inArray } from 'drizzle-orm';

import type { AnswerSource } from '@domain/entities/AnswerSource';
import type { AnswerSourceRepository } from '@domain/repository-contracts/AnswerSourceRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { answerSourcePriorityOrder } from '@infrastructure/database/ordering';
import { mapAnswerSourceRecord, toAnswerSourceInsert } from '@infrastructure/database/mappers';
import { answerSources } from '@infrastructure/database/schema';

export class DrizzleAnswerSourceRepository implements AnswerSourceRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listByAnswerId(answerId: string) {
    const rows = await this.db.query.answerSources.findMany({
      where: eq(answerSources.answerId, answerId),
      orderBy: [
        answerSourcePriorityOrder,
        desc(answerSources.relevanceScore),
        asc(answerSources.createdAt),
        asc(answerSources.id),
      ],
    });

    return rows.map(mapAnswerSourceRecord);
  }

  async listByAnswerIds(answerIds: string[]) {
    if (!answerIds.length) {
      return [];
    }

    const rows = await this.db.query.answerSources.findMany({
      where: inArray(answerSources.answerId, answerIds),
      orderBy: [
        asc(answerSources.answerId),
        answerSourcePriorityOrder,
        desc(answerSources.relevanceScore),
        asc(answerSources.createdAt),
        asc(answerSources.id),
      ],
    });
    return rows.map(mapAnswerSourceRecord);
  }

  async saveMany(sources: AnswerSource[]) {
    if (!sources.length) {
      return;
    }

    await this.db.insert(answerSources).values(sources.map(toAnswerSourceInsert));
  }
}
