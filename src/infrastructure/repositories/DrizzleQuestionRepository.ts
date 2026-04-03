import { and, desc, eq } from 'drizzle-orm';

import type { Question } from '@domain/entities/Question';
import type { QuestionRepository } from '@domain/repository-contracts/QuestionRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapQuestionRecord, toQuestionInsert } from '@infrastructure/database/mappers';
import { questions } from '@infrastructure/database/schema';

export class DrizzleQuestionRepository implements QuestionRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db.query.questions.findMany({
      where: eq(questions.sessionId, sessionId),
      orderBy: [desc(questions.createdAt), desc(questions.id)],
    });

    return rows.map(mapQuestionRecord);
  }

  async listPublicBySession(sessionId: string) {
    const rows = await this.db.query.questions.findMany({
      where: and(eq(questions.sessionId, sessionId), eq(questions.visibility, 'public')),
      orderBy: [desc(questions.createdAt), desc(questions.id)],
    });

    return rows.map(mapQuestionRecord);
  }

  async findById(id: string) {
    const row = await this.db.query.questions.findFirst({
      where: eq(questions.id, id),
    });

    return row ? mapQuestionRecord(row) : null;
  }

  async save(question: Question) {
    await this.db.insert(questions).values(toQuestionInsert(question));
  }
}
