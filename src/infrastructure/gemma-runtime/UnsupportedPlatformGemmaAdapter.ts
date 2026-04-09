import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import { GemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import type { LLMGenerationInput } from '@domain/service-contracts/LLMService';
import type { LocalModelTarget } from '@shared/config/modelConfig';
import { Platform } from 'react-native';

export class UnsupportedPlatformGemmaAdapter implements GemmaAdapter {
  readonly provider = 'gemma' as const;
  readonly executionMode = 'local-placeholder' as const;
  readonly modelId: string;

  constructor(private readonly targetModel: LocalModelTarget) {
    this.modelId = targetModel.modelId;
  }

  async getStatus(): Promise<GemmaRuntimeStatus> {
    return {
      code: 'unsupported_platform',
      modelId: this.modelId,
      executionMode: this.executionMode,
      sourcePresent: false,
      artifactPresent: false,
      bundledAssetPresent: false,
      deviceModelPresent: false,
      message: `Real local Gemma GGUF runtime is only enabled on Android development builds. Current platform: ${Platform.OS}.`,
    };
  }

  async warmup() {
    throw new GemmaRuntimeError(await this.getStatus());
  }

  async isAvailable() {
    return false;
  }

  async generateText(_input: LLMGenerationInput): Promise<string> {
    throw new GemmaRuntimeError(await this.getStatus());
  }
}
