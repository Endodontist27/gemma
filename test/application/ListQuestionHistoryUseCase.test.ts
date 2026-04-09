import { describe, expect, it, vi } from 'vitest';

import { ListQuestionHistoryUseCase } from '@application/use-cases/ListQuestionHistoryUseCase';
import type { AnswerRepository } from '@domain/repository-contracts/AnswerRepository';
import type { AnswerSourceRepository } from '@domain/repository-contracts/AnswerSourceRepository';
import type { QACategoryRepository } from '@domain/repository-contracts/QACategoryRepository';
import type { QuestionRepository } from '@domain/repository-contracts/QuestionRepository';

describe('ListQuestionHistoryUseCase', () => {
  it('returns only local user questions in repository order with answers, sources, and categories', async () => {
    const questionRepository: QuestionRepository = {
      listBySession: vi.fn().mockResolvedValue([
        {
          id: 'question_local_newest',
          sessionId: 'session_demo',
          categoryId: 'category_grounding',
          text: 'Newest local question',
          normalizedText: 'newest local question',
          status: 'supported',
          visibility: 'private',
          origin: 'user_local',
          createdAt: '2026-04-03T10:05:00.000Z',
          updatedAt: '2026-04-03T10:05:00.000Z',
        },
        {
          id: 'question_seed_public',
          sessionId: 'session_demo',
          categoryId: 'category_grounding',
          text: 'Seeded public question',
          normalizedText: 'seeded public question',
          status: 'supported',
          visibility: 'public',
          origin: 'seed_public',
          createdAt: '2026-04-03T10:04:00.000Z',
          updatedAt: '2026-04-03T10:04:00.000Z',
        },
        {
          id: 'question_local_older',
          sessionId: 'session_demo',
          categoryId: null,
          text: 'Older local question',
          normalizedText: 'older local question',
          status: 'unsupported',
          visibility: 'private',
          origin: 'user_local',
          createdAt: '2026-04-03T10:03:00.000Z',
          updatedAt: '2026-04-03T10:03:00.000Z',
        },
      ]),
      listPublicBySession: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
    };
    const answerRepository: AnswerRepository = {
      findByQuestionId: vi.fn(),
      listByQuestionIds: vi.fn().mockResolvedValue([
        {
          id: 'answer_older',
          questionId: 'question_local_older',
          sessionId: 'session_demo',
          text: 'Older local answer',
          state: 'unsupported',
          confidenceScore: 0,
          createdAt: '2026-04-03T10:03:01.000Z',
        },
        {
          id: 'answer_newest',
          questionId: 'question_local_newest',
          sessionId: 'session_demo',
          text: 'Newest local answer',
          state: 'grounded',
          confidenceScore: 0.91,
          createdAt: '2026-04-03T10:05:01.000Z',
        },
      ]),
      save: vi.fn(),
    };
    const answerSourceRepository: AnswerSourceRepository = {
      findById: vi.fn(),
      listByAnswerId: vi.fn(),
      listByAnswerIds: vi.fn().mockResolvedValue([
        {
          id: 'source_newest',
          answerId: 'answer_newest',
          sessionId: 'session_demo',
          sourceType: 'glossary_term',
          sourceRecordId: 'glossary_rag',
          label: 'Glossary: RAG',
          excerpt: 'RAG combines retrieval with generation.',
          relevanceScore: 1.8,
          createdAt: '2026-04-03T10:05:01.000Z',
        },
      ]),
      saveMany: vi.fn(),
    };
    const qaCategoryRepository: QACategoryRepository = {
      listBySession: vi.fn().mockResolvedValue([
        {
          id: 'category_grounding',
          sessionId: 'session_demo',
          key: 'grounding',
          label: 'Grounding',
          description: 'Grounding questions',
          createdAt: '2026-04-03T09:00:00.000Z',
        },
      ]),
      findByKey: vi.fn(),
      saveMany: vi.fn(),
    };

    const useCase = new ListQuestionHistoryUseCase(
      questionRepository,
      answerRepository,
      answerSourceRepository,
      qaCategoryRepository,
    );

    const result = await useCase.execute('session_demo');

    expect(result).toHaveLength(2);
    expect(result[0]?.question.id).toBe('question_local_newest');
    expect(result[0]?.answer.id).toBe('answer_newest');
    expect(result[0]?.sources).toHaveLength(1);
    expect(result[0]?.category?.label).toBe('Grounding');
    expect(result[1]?.question.id).toBe('question_local_older');
    expect(result[1]?.answer.text).toBe('Older local answer');
    expect(result[1]?.sources).toEqual([]);
  });

  it('filters out local questions that somehow do not have a persisted answer yet', async () => {
    const questionRepository: QuestionRepository = {
      listBySession: vi.fn().mockResolvedValue([
        {
          id: 'question_without_answer',
          sessionId: 'session_demo',
          categoryId: null,
          text: 'Dangling question',
          normalizedText: 'dangling question',
          status: 'supported',
          visibility: 'private',
          origin: 'user_local',
          createdAt: '2026-04-03T10:05:00.000Z',
          updatedAt: '2026-04-03T10:05:00.000Z',
        },
      ]),
      listPublicBySession: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
    };
    const answerRepository: AnswerRepository = {
      findByQuestionId: vi.fn(),
      listByQuestionIds: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
    };
    const answerSourceRepository: AnswerSourceRepository = {
      findById: vi.fn(),
      listByAnswerId: vi.fn(),
      listByAnswerIds: vi.fn().mockResolvedValue([]),
      saveMany: vi.fn(),
    };
    const qaCategoryRepository: QACategoryRepository = {
      listBySession: vi.fn().mockResolvedValue([]),
      findByKey: vi.fn(),
      saveMany: vi.fn(),
    };

    const useCase = new ListQuestionHistoryUseCase(
      questionRepository,
      answerRepository,
      answerSourceRepository,
      qaCategoryRepository,
    );

    await expect(useCase.execute('session_demo')).resolves.toEqual([]);
  });
});
