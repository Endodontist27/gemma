import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import { GemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { LLMGenerationInput, LLMService } from '@domain/service-contracts/LLMService';
import { Platform } from 'react-native';

class ResolvedLLMService implements LLMService {
  constructor(
    private readonly gemmaAdapter: GemmaAdapter,
    private readonly fallback: LLMService,
  ) {}

  async generateText(input: LLMGenerationInput): Promise<string> {
    if (await this.gemmaAdapter.isAvailable()) {
      return this.gemmaAdapter.generateText(input);
    }

    if (Platform.OS === 'android') {
      throw new GemmaRuntimeError(await this.gemmaAdapter.getStatus());
    }

    return this.fallback.generateText(input);
  }
}

export const resolveLLMService = (gemmaAdapter: GemmaAdapter, fallback: LLMService): LLMService =>
  new ResolvedLLMService(gemmaAdapter, fallback);
