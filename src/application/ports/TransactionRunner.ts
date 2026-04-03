import type { Answer } from '@domain/entities/Answer';
import type { AnswerSource } from '@domain/entities/AnswerSource';
import type { Question } from '@domain/entities/Question';

export interface QuestionAnswerWriteTransaction {
  saveQuestion(question: Question): void;
  saveAnswer(answer: Answer): void;
  saveAnswerSources(sources: AnswerSource[]): void;
}

export interface TransactionRunner {
  runInTransaction<T>(operation: (transaction: QuestionAnswerWriteTransaction) => T): Promise<T>;
}
