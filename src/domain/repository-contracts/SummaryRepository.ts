import type { Summary } from '@domain/entities/Summary';

export interface SummaryRepository {
  /** Ordered by summary kind: overview, key points, exam focus. */
  listBySession(sessionId: string): Promise<Summary[]>;
  saveMany(summaries: Summary[]): Promise<void>;
}
