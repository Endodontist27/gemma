import type { QACategory } from '@domain/entities/QACategory';

export interface CategorizationService {
  categorize(questionText: string, categories: QACategory[]): Promise<QACategory | null>;
}
