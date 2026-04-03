import { LectureSessionSchema, type LectureSession } from '@domain/entities/LectureSession';
import { lectureSessions } from '@infrastructure/database/schema';
import { deserializeStringArray, serializeStringArray } from '@infrastructure/database/serializers';

export const mapLectureSessionRecord = (
  record: typeof lectureSessions.$inferSelect,
): LectureSession =>
  LectureSessionSchema.parse({
    id: record.id,
    title: record.title,
    courseCode: record.courseCode,
    lecturer: record.lecturer,
    description: record.description,
    location: record.location,
    startsAt: record.startsAt,
    status: record.status,
    sourcePackVersion: record.sourcePackVersion,
    tags: deserializeStringArray(record.tagsJson),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

export const toLectureSessionInsert = (
  entity: LectureSession,
): typeof lectureSessions.$inferInsert => ({
  id: entity.id,
  title: entity.title,
  courseCode: entity.courseCode,
  lecturer: entity.lecturer,
  description: entity.description,
  location: entity.location,
  startsAt: entity.startsAt,
  status: entity.status,
  sourcePackVersion: entity.sourcePackVersion,
  tagsJson: serializeStringArray(entity.tags),
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
