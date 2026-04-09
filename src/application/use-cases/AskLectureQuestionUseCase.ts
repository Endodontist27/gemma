import type { GroundedAnswerResultDto } from '@application/dto/GroundedAnswerResultDto';
import type { TransactionRunner } from '@application/ports/TransactionRunner';
import { buildUnsupportedAnswer } from '@domain/business-rules/GroundedAnswerPolicy';
import type { QACategoryRepository } from '@domain/repository-contracts/QACategoryRepository';
import type { CategorizationService } from '@domain/service-contracts/CategorizationService';
import type { QuestionAnsweringService } from '@domain/service-contracts/QuestionAnsweringService';
import type { RetrievalService } from '@domain/service-contracts/RetrievalService';
import type { SupportCheckService } from '@domain/service-contracts/SupportCheckService';
import { nowIso } from '@shared/utils/dates';
import { logDev } from '@shared/utils/debug';
import { createEntityId } from '@shared/utils/ids';
import { normalizeText } from '@shared/utils/text';

export class AskLectureQuestionUseCase {
  constructor(
    private readonly qaCategoryRepository: QACategoryRepository,
    private readonly categorizationService: CategorizationService,
    private readonly retrievalService: RetrievalService,
    private readonly supportCheckService: SupportCheckService,
    private readonly questionAnsweringService: QuestionAnsweringService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(sessionId: string, questionText: string): Promise<GroundedAnswerResultDto> {
    const trimmedQuestion = questionText.trim();
    const timestamp = nowIso();
    const requestStartedAt = Date.now();

    logDev('ask', 'Starting grounded QA request', {
      sessionId,
      questionLength: trimmedQuestion.length,
    });

    try {
      const categories = await this.qaCategoryRepository.listBySession(sessionId);
      const category = await this.categorizationService.categorize(trimmedQuestion, categories);
      const retrieval = await this.retrievalService.retrieve(sessionId, trimmedQuestion);
      const supportDecision = await this.supportCheckService.checkSupport(trimmedQuestion, retrieval);

      logDev('ask', 'Support check completed', {
        sessionId,
        categoryId: category?.id ?? null,
        isSupported: supportDecision.isSupported,
        retrievalMatchCount: retrieval.matches.length,
      });

      if (!supportDecision.isSupported) {
        const question = {
          id: createEntityId('question'),
          sessionId,
          categoryId: category?.id ?? null,
          text: trimmedQuestion,
          normalizedText: normalizeText(trimmedQuestion),
          status: 'unsupported' as const,
          visibility: 'private' as const,
          origin: 'user_local' as const,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        const answer = {
          id: createEntityId('answer'),
          questionId: question.id,
          sessionId,
          text: buildUnsupportedAnswer(),
          state: 'unsupported' as const,
          confidenceScore: 0,
          createdAt: timestamp,
        };
        const persistenceStartedAt = Date.now();

        logDev('ask', 'Persisting unsupported QA result', {
          sessionId,
          questionId: question.id,
          answerId: answer.id,
        });

        await this.transactionRunner.runInTransaction((transaction) => {
          transaction.saveQuestion(question);
          transaction.saveAnswer(answer);
        });

        logDev('ask', 'Unsupported QA result persisted', {
          sessionId,
          questionId: question.id,
          answerId: answer.id,
          durationMs: Date.now() - requestStartedAt,
          persistenceDurationMs: Date.now() - persistenceStartedAt,
        });

        return {
          question,
          answer,
          sources: [],
          category,
        };
      }

      const answerDraft = await this.questionAnsweringService.answerQuestion(
        sessionId,
        trimmedQuestion,
        retrieval,
        category,
      );

      const finalSupported = answerDraft.supported && supportDecision.isSupported;
      const question = {
        id: createEntityId('question'),
        sessionId,
        categoryId: answerDraft.category?.id ?? category?.id ?? null,
        text: trimmedQuestion,
        normalizedText: normalizeText(trimmedQuestion),
        status: finalSupported ? ('supported' as const) : ('unsupported' as const),
        visibility: 'private' as const,
        origin: 'user_local' as const,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const answer = {
        id: createEntityId('answer'),
        questionId: question.id,
        sessionId,
        text: finalSupported ? answerDraft.answerText : buildUnsupportedAnswer(),
        state: finalSupported ? ('grounded' as const) : ('unsupported' as const),
        confidenceScore: finalSupported ? answerDraft.confidenceScore : 0,
        createdAt: timestamp,
      };

      const sources = finalSupported
        ? answerDraft.sources.map((source) => ({
            id: createEntityId('answer_source'),
            answerId: answer.id,
            sessionId,
            sourceType: source.sourceType,
            sourceRecordId: source.sourceRecordId,
            label: source.label,
            excerpt: source.excerpt,
            relevanceScore: source.score,
            createdAt: timestamp,
          }))
        : [];
      const persistenceStartedAt = Date.now();

      logDev('ask', 'Persisting grounded QA result', {
        sessionId,
        questionId: question.id,
        answerId: answer.id,
        answerState: answer.state,
        sourceCount: sources.length,
      });

      await this.transactionRunner.runInTransaction((transaction) => {
        transaction.saveQuestion(question);
        transaction.saveAnswer(answer);
        transaction.saveAnswerSources(sources);
      });

      logDev('ask', 'Grounded QA result persisted', {
        sessionId,
        questionId: question.id,
        answerId: answer.id,
        answerState: answer.state,
        sourceCount: sources.length,
        durationMs: Date.now() - requestStartedAt,
        persistenceDurationMs: Date.now() - persistenceStartedAt,
      });

      return {
        question,
        answer,
        sources,
        category: answerDraft.category,
      };
    } catch (error) {
      logDev('ask', 'Grounded QA request failed', {
        sessionId,
        questionLength: trimmedQuestion.length,
        durationMs: Date.now() - requestStartedAt,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
