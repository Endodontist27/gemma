import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import type { LLMGenerationInput } from '@domain/service-contracts/LLMService';
import type { LocalModelTarget } from '@shared/config/modelConfig';
import { modelConfig } from '@shared/config/modelConfig';

export class GemmaLocalAdapter implements GemmaAdapter {
  readonly provider = 'gemma' as const;
  readonly modelId: string;
  readonly executionMode = 'local-placeholder' as const;

  constructor(targetModel: LocalModelTarget = modelConfig.primary) {
    this.modelId = targetModel.modelId;
  }

  async isAvailable() {
    return false;
  }

  async generateText(_input: LLMGenerationInput): Promise<string> {
    throw new Error(
      `${this.modelId} is configured as the local Gemma target, but no phone-local runtime is connected yet. Keep the adapter abstract so the backend implementation can be swapped later without changing app logic.`,
    );
  }
}
