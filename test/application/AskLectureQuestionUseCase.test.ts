import { describe, expect, it, vi } from 'vitest';

import type {
  QuestionAnswerWriteTransaction,
  TransactionRunner,
} from '@application/ports/TransactionRunner';
import { AskLectureQuestionUseCase } from '@application/use-cases/AskLectureQuestionUseCase';
import type { QACategory } from '@domain/entities/QACategory';
import type { CategorizationService } from '@domain/service-contracts/CategorizationService';
import type {
  GroundedAnswerDraft,
  QuestionAnsweringService,
} from '@domain/service-contracts/QuestionAnsweringService';
import type { RetrievalResult, RetrievalService } from '@domain/service-contracts/RetrievalService';
import type { SupportCheckService } from '@domain/service-contracts/SupportCheckService';
import type { QACategoryRepository } from '@domain/repository-contracts/QACategoryRepository';

class FakeTransactionRunner implements TransactionRunner {
  readonly questions: { status: string }[] = [];
  readonly answers: { state: string }[] = [];
  readonly sources: { label: string }[] = [];

  constructor(private readonly failAt: 'question' | 'answer' | 'sources' | null = null) {}

  async runInTransaction<T>(operation: (transaction: QuestionAnswerWriteTransaction) => T) {
    const stagedQuestions: { status: string }[] = [];
    const stagedAnswers: { state: string }[] = [];
    const stagedSources: { label: string }[] = [];

    const transaction: QuestionAnswerWriteTransaction = {
      saveQuestion: (question) => {
        stagedQuestions.push(question);
        if (this.failAt === 'question') {
          throw new Error('question write failed');
        }
      },
      saveAnswer: (answer) => {
        stagedAnswers.push(answer);
        if (this.failAt === 'answer') {
          throw new Error('answer write failed');
        }
      },
      saveAnswerSources: (sources) => {
        stagedSources.push(...sources);
        if (this.failAt === 'sources') {
          throw new Error('source write failed');
        }
      },
    };

    const result = operation(transaction);
    this.questions.push(...stagedQuestions);
    this.answers.push(...stagedAnswers);
    this.sources.push(...stagedSources);

    return result;
  }
}

const category: QACategory = {
  id: 'category_grounding',
  sessionId: 'session_demo',
  key: 'grounding',
  label: 'Grounding',
  description: 'Grounding questions',
  createdAt: '2026-04-03T09:00:00.000Z',
};

const categoryRepository: QACategoryRepository = {
  listBySession: vi.fn().mockResolvedValue([category]),
  findByKey: vi.fn().mockResolvedValue(category),
  saveMany: vi.fn().mockResolvedValue(undefined),
};

const supportedRetrieval: RetrievalResult = {
  matches: [
    {
      sourceType: 'glossary_term',
      sourceRecordId: 'glossary_rag',
      label: 'Glossary: RAG',
      excerpt: 'Retrieval-augmented generation uses local evidence.',
      score: 2,
    },
  ],
};

const createUseCase = ({
  retrievalResult = supportedRetrieval,
  supportCheckService,
  questionAnsweringService,
  transactionRunner,
}: {
  retrievalResult?: RetrievalResult;
  supportCheckService: SupportCheckService;
  questionAnsweringService: QuestionAnsweringService;
  transactionRunner: TransactionRunner;
}) => {
  const categorizationService: CategorizationService = {
    categorize: vi.fn().mockResolvedValue(category),
  };
  const retrievalService: RetrievalService = {
    retrieve: vi.fn().mockResolvedValue(retrievalResult),
  };

  return new AskLectureQuestionUseCase(
    categoryRepository,
    categorizationService,
    retrievalService,
    supportCheckService,
    questionAnsweringService,
    transactionRunner,
  );
};

describe('AskLectureQuestionUseCase', () => {
  it('persists supported questions, answers, and sources atomically', async () => {
    const transactionRunner = new FakeTransactionRunner();
    const supportCheckService: SupportCheckService = {
      checkSupport: vi.fn().mockResolvedValue({
        isSupported: true,
        reason: 'Grounded lecture evidence is available locally.',
      }),
    };
    const questionAnsweringService: QuestionAnsweringService = {
      answerQuestion: vi.fn().mockResolvedValue({
        supported: true,
        answerText: 'RAG combines retrieval with generation grounded in local lecture data.',
        confidenceScore: 0.92,
        sources: supportedRetrieval.matches,
        category,
      } satisfies GroundedAnswerDraft),
    };
    const useCase = createUseCase({
      supportCheckService,
      questionAnsweringService,
      transactionRunner,
    });

    const result = await useCase.execute('session_demo', 'What does RAG mean here?');

    expect(result.question.status).toBe('supported');
    expect(transactionRunner.questions).toHaveLength(1);
    expect(transactionRunner.answers).toHaveLength(1);
    expect(transactionRunner.sources).toHaveLength(1);
    expect(transactionRunner.questions[0]?.status).toBe('supported');
    expect(transactionRunner.answers[0]?.state).toBe('grounded');
  });

  it('persists unsupported questions with an unsupported answer and zero sources', async () => {
    const transactionRunner = new FakeTransactionRunner();
    const supportCheckService: SupportCheckService = {
      checkSupport: vi.fn().mockResolvedValue({
        isSupported: false,
        reason: 'No local lecture evidence met the support threshold.',
      }),
    };
    const questionAnsweringService: QuestionAnsweringService = {
      answerQuestion: vi.fn(),
    };
    const useCase = createUseCase({
      retrievalResult: { matches: [] },
      supportCheckService,
      questionAnsweringService,
      transactionRunner,
    });

    const result = await useCase.execute('session_demo', 'Can you speculate about future content?');

    expect(result.question.status).toBe('unsupported');
    expect(result.answer.state).toBe('unsupported');
    expect(result.sources).toEqual([]);
    expect(transactionRunner.questions).toHaveLength(1);
    expect(transactionRunner.answers).toHaveLength(1);
    expect(transactionRunner.sources).toHaveLength(0);
    expect(questionAnsweringService.answerQuestion).not.toHaveBeenCalled();
  });

  it('rolls back the entire write when persistence fails mid-transaction', async () => {
    const transactionRunner = new FakeTransactionRunner('answer');
    const supportCheckService: SupportCheckService = {
      checkSupport: vi.fn().mockResolvedValue({
        isSupported: true,
        reason: 'Grounded lecture evidence is available locally.',
      }),
    };
    const questionAnsweringService: QuestionAnsweringService = {
      answerQuestion: vi.fn().mockResolvedValue({
        supported: true,
        answerText: 'RAG combines retrieval with generation grounded in local lecture data.',
        confidenceScore: 0.92,
        sources: supportedRetrieval.matches,
        category,
      } satisfies GroundedAnswerDraft),
    };
    const useCase = createUseCase({
      supportCheckService,
      questionAnsweringService,
      transactionRunner,
    });

    await expect(useCase.execute('session_demo', 'What does RAG mean here?')).rejects.toThrow(
      'answer write failed',
    );

    expect(transactionRunner.questions).toEqual([]);
    expect(transactionRunner.answers).toEqual([]);
    expect(transactionRunner.sources).toEqual([]);
  });

  it('stores the final unsupported question status when answer generation downgrades support', async () => {
    const transactionRunner = new FakeTransactionRunner();
    const supportCheckService: SupportCheckService = {
      checkSupport: vi.fn().mockResolvedValue({
        isSupported: true,
        reason: 'Grounded lecture evidence is available locally.',
      }),
    };
    const questionAnsweringService: QuestionAnsweringService = {
      answerQuestion: vi.fn().mockResolvedValue({
        supported: false,
        answerText: 'Ignored downgrade answer',
        confidenceScore: 0.4,
        sources: [],
        category,
      } satisfies GroundedAnswerDraft),
    };
    const useCase = createUseCase({
      supportCheckService,
      questionAnsweringService,
      transactionRunner,
    });

    const result = await useCase.execute('session_demo', 'What does RAG mean here?');

    expect(result.question.status).toBe('unsupported');
    expect(result.answer.state).toBe('unsupported');
    expect(transactionRunner.questions[0]?.status).toBe('unsupported');
  });
});
