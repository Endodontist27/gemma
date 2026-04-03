import type { LLMGenerationInput, LLMService } from '@domain/service-contracts/LLMService';
import { toExcerpt } from '@shared/utils/text';

export class MockLLMService implements LLMService {
  async generateText(input: LLMGenerationInput) {
    const evidence = input.evidence.filter(Boolean).slice(0, input.mode === 'summary' ? 3 : 2);

    if (!evidence.length) {
      return '';
    }

    return evidence.map((item) => toExcerpt(item, 140)).join(' ');
  }
}
