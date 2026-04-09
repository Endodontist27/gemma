import type { QACategory } from '@domain/entities/QACategory';
import {
  buildUnsupportedAnswer,
  sortMatchesByPriority,
} from '@domain/business-rules/GroundedAnswerPolicy';
import type { LLMService } from '@domain/service-contracts/LLMService';
import type {
  GroundedAnswerDraft,
  QuestionAnsweringService,
} from '@domain/service-contracts/QuestionAnsweringService';
import type { RetrievalResult } from '@domain/service-contracts/RetrievalService';

export class MockGroundedQuestionAnsweringService implements QuestionAnsweringService {
  constructor(private readonly llmService: LLMService) {}

  async answerQuestion(
    _sessionId: string,
    questionText: string,
    retrieval: RetrievalResult,
    category: QACategory | null,
  ): Promise<GroundedAnswerDraft> {
    const prioritizedMatches = sortMatchesByPriority(retrieval.matches).slice(0, 3);

    if (!prioritizedMatches.length) {
      return {
        supported: false,
        answerText: buildUnsupportedAnswer(),
        confidenceScore: 0,
        sources: [],
        category,
      };
    }

    const answerText =
      (await this.llmService.generateText({
        mode: 'answer',
        question: questionText,
        instruction: 'Condense the grounded lecture evidence into a short answer.',
        evidence: prioritizedMatches.map((match) => `${match.label}: ${match.excerpt}`),
      })) || prioritizedMatches[0].excerpt;

    const averageScore =
      prioritizedMatches.reduce((sum, match) => sum + match.score, 0) / prioritizedMatches.length;

    return {
      supported: true,
      answerText,
      confidenceScore: Math.min(0.98, Number((averageScore / 2.5).toFixed(2))),
      sources: prioritizedMatches,
      category,
    };
  }
}
