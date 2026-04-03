import { asc, desc, eq } from 'drizzle-orm';

import type { LectureSession } from '@domain/entities/LectureSession';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapLectureSessionRecord, toLectureSessionInsert } from '@infrastructure/database/mappers';
import { lectureSessions } from '@infrastructure/database/schema';

export class DrizzleLectureSessionRepository implements LectureSessionRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async count() {
    const sessions = await this.db.select({ id: lectureSessions.id }).from(lectureSessions);
    return sessions.length;
  }

  async list() {
    const rows = await this.db.query.lectureSessions.findMany({
      orderBy: [
        desc(lectureSessions.startsAt),
        asc(lectureSessions.title),
        asc(lectureSessions.id),
      ],
    });
    return rows.map(mapLectureSessionRecord);
  }

  async findById(id: string) {
    const row = await this.db.query.lectureSessions.findFirst({
      where: eq(lectureSessions.id, id),
    });

    return row ? mapLectureSessionRecord(row) : null;
  }

  async save(session: LectureSession) {
    await this.db.insert(lectureSessions).values(toLectureSessionInsert(session));
  }
}
