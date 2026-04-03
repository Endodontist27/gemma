import type { RetrievalResult } from '@domain/service-contracts/RetrievalService';

export interface SupportDecision {
  isSupported: boolean;
  reason: string;
}

export interface SupportCheckService {
  checkSupport(questionText: string, retrieval: RetrievalResult): Promise<SupportDecision>;
}
