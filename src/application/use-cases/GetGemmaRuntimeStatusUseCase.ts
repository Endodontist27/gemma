import { isGemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';

interface GetGemmaRuntimeStatusOptions {
  probeWarmup?: boolean;
}

export class GetGemmaRuntimeStatusUseCase {
  constructor(private readonly gemmaAdapter: GemmaAdapter) {}

  async execute(options: GetGemmaRuntimeStatusOptions = {}) {
    if (!options.probeWarmup) {
      return this.gemmaAdapter.getStatus();
    }

    const status = await this.gemmaAdapter.getStatus();
    if (status.code !== 'ready' && status.code !== 'warmup_failed') {
      return status;
    }

    try {
      await this.gemmaAdapter.warmup();
      return this.gemmaAdapter.getStatus();
    } catch (error) {
      if (isGemmaRuntimeError(error)) {
        return error.status;
      }

      throw error;
    }
  }
}
