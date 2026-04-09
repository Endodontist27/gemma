import type { LectureSession } from '@domain/entities/LectureSession';

export interface LectureSessionRepository {
  count(): Promise<number>;
  /** Ordered by session start descending, then title, then stable id order. */
  list(): Promise<LectureSession[]>;
  findById(id: string): Promise<LectureSession | null>;
  deleteById(id: string): Promise<void>;
  clearAll(): Promise<void>;
  save(session: LectureSession): Promise<void>;
}
