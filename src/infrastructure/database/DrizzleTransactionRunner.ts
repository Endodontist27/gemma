import type {
  QuestionAnswerWriteTransaction,
  TransactionRunner,
} from '@application/ports/TransactionRunner';
import type { AppDatabase } from '@infrastructure/database/client';
import {
  toAnswerInsert,
  toAnswerSourceInsert,
  toQuestionInsert,
} from '@infrastructure/database/mappers';
import { answerSources, answers, questions } from '@infrastructure/database/schema';

export class DrizzleTransactionRunner implements TransactionRunner {
  constructor(private readonly db: AppDatabase) {}

  async runInTransaction<T>(operation: (transaction: QuestionAnswerWriteTransaction) => T) {
    return this.db.transaction((tx) => {
      const transaction: QuestionAnswerWriteTransaction = {
        saveQuestion: (question) => {
          tx.insert(questions).values(toQuestionInsert(question)).run();
        },
        saveAnswer: (answer) => {
          tx.insert(answers).values(toAnswerInsert(answer)).run();
        },
        saveAnswerSources: (sources) => {
          if (!sources.length) {
            return;
          }

          tx.insert(answerSources).values(sources.map(toAnswerSourceInsert)).run();
        },
      };

      return operation(transaction);
    });
  }
}
