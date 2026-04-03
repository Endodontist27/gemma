import type { AnswerSourceType } from '@domain/value-objects/KnowledgeEnums';

export interface RetrievalMatch {
  sourceType: AnswerSourceType;
  sourceRecordId: string;
  label: string;
  excerpt: string;
  score: number;
}

export interface RetrievalResult {
  matches: RetrievalMatch[];
}

export interface RetrievalService {
  retrieve(sessionId: string, questionText: string): Promise<RetrievalResult>;
}
