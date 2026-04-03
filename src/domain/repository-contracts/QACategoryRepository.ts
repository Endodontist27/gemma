import type { QACategory } from '@domain/entities/QACategory';

export interface QACategoryRepository {
  /** Ordered by creation time, then label, then stable id order. */
  listBySession(sessionId: string): Promise<QACategory[]>;
  findByKey(sessionId: string, key: string): Promise<QACategory | null>;
  saveMany(categories: QACategory[]): Promise<void>;
}
