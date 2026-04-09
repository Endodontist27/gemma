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
    const rows = await this.db
      .select()
      .from(lectureSessions)
      .orderBy(desc(lectureSessions.startsAt), asc(lectureSessions.title), asc(lectureSessions.id));
    return rows.map(mapLectureSessionRecord);
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(lectureSessions)
      .where(eq(lectureSessions.id, id))
      .limit(1);
    const row = rows[0];

    return row ? mapLectureSessionRecord(row) : null;
  }

  async deleteById(id: string) {
    await this.db.delete(lectureSessions).where(eq(lectureSessions.id, id)).run();
  }

  async clearAll() {
    await this.db.delete(lectureSessions).run();
  }

  async save(session: LectureSession) {
    await this.db.insert(lectureSessions).values(toLectureSessionInsert(session)).run();
  }
}
