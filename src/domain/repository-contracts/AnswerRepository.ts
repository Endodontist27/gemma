import type { Answer } from '@domain/entities/Answer';

export interface AnswerRepository {
  findByQuestionId(questionId: string): Promise<Answer | null>;
  /** Ordered by created time ascending, then stable id order. */
  listByQuestionIds(questionIds: string[]): Promise<Answer[]>;
  save(answer: Answer): Promise<void>;
}
