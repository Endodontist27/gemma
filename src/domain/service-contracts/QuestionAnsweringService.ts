import type { QACategory } from '@domain/entities/QACategory';
import type { RetrievalMatch, RetrievalResult } from '@domain/service-contracts/RetrievalService';

export interface GroundedAnswerDraft {
  supported: boolean;
  answerText: string;
  confidenceScore: number;
  sources: RetrievalMatch[];
  category: QACategory | null;
}

export interface QuestionAnsweringService {
  answerQuestion(
    sessionId: string,
    questionText: string,
    retrieval: RetrievalResult,
    category: QACategory | null,
  ): Promise<GroundedAnswerDraft>;
}
