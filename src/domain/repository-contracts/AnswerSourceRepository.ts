import type { AnswerSource } from '@domain/entities/AnswerSource';

export interface AnswerSourceRepository {
  /** Ordered by source priority, then relevance descending, then stable id order. */
  listByAnswerId(answerId: string): Promise<AnswerSource[]>;
  /** Ordered by answer id, then source priority, then relevance descending. */
  listByAnswerIds(answerIds: string[]): Promise<AnswerSource[]>;
  saveMany(sources: AnswerSource[]): Promise<void>;
}
