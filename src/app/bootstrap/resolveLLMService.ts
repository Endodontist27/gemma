import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import type { LLMGenerationInput, LLMService } from '@domain/service-contracts/LLMService';

class ResolvedLLMService implements LLMService {
  constructor(
    private readonly gemmaAdapter: GemmaAdapter,
    private readonly fallback: LLMService,
  ) {}

  async generateText(input: LLMGenerationInput): Promise<string> {
    if (await this.gemmaAdapter.isAvailable()) {
      return this.gemmaAdapter.generateText(input);
    }

    return this.fallback.generateText(input);
  }
}

export const resolveLLMService = (gemmaAdapter: GemmaAdapter, fallback: LLMService): LLMService =>
  new ResolvedLLMService(gemmaAdapter, fallback);
