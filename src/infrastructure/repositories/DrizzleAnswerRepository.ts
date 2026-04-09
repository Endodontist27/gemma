import { asc, eq, inArray } from 'drizzle-orm';

import type { Answer } from '@domain/entities/Answer';
import type { AnswerRepository } from '@domain/repository-contracts/AnswerRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapAnswerRecord, toAnswerInsert } from '@infrastructure/database/mappers';
import { answers } from '@infrastructure/database/schema';

export class DrizzleAnswerRepository implements AnswerRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async findByQuestionId(questionId: string) {
    const rows = await this.db
      .select()
      .from(answers)
      .where(eq(answers.questionId, questionId))
      .limit(1);
    const row = rows[0];

    return row ? mapAnswerRecord(row) : null;
  }

  async listByQuestionIds(questionIds: string[]) {
    if (!questionIds.length) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(answers)
      .where(inArray(answers.questionId, questionIds))
      .orderBy(asc(answers.createdAt), asc(answers.id));
    return rows.map(mapAnswerRecord);
  }

  async save(answer: Answer) {
    await this.db.insert(answers).values(toAnswerInsert(answer)).run();
  }
}
