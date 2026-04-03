import type { Question } from '@domain/entities/Question';

export interface QuestionRepository {
  /** Ordered by newest first, then stable id order. */
  listBySession(sessionId: string): Promise<Question[]>;
  /** Ordered by newest public questions first, then stable id order. */
  listPublicBySession(sessionId: string): Promise<Question[]>;
  findById(id: string): Promise<Question | null>;
  save(question: Question): Promise<void>;
}
