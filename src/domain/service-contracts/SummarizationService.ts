import type { Summary } from '@domain/entities/Summary';

export interface SummarizationService {
  generateSessionSummaries(sessionId: string): Promise<Summary[]>;
}
