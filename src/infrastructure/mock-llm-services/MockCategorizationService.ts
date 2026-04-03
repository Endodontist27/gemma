import type { QACategory } from '@domain/entities/QACategory';
import type { CategorizationService } from '@domain/service-contracts/CategorizationService';
import { normalizeText } from '@shared/utils/text';

const rules: Record<string, string[]> = {
  exam_prep: ['exam', 'quiz', 'test', 'assessment', 'revision'],
  applications: ['apply', 'example', 'use', 'practical', 'implementation'],
  logistics: ['when', 'where', 'schedule', 'deadline', 'location'],
  concepts: ['what', 'why', 'define', 'meaning', 'concept', 'grounding'],
};

export class MockCategorizationService implements CategorizationService {
  async categorize(questionText: string, categories: QACategory[]) {
    const normalized = normalizeText(questionText);

    for (const category of categories) {
      const keywords = rules[category.key] ?? [];

      if (keywords.some((keyword) => normalized.includes(keyword))) {
        return category;
      }
    }

    return categories[0] ?? null;
  }
}
