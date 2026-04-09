import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import type { LLMService } from '@domain/service-contracts/LLMService';

export interface GemmaAdapter extends LLMService {
  readonly provider: 'gemma';
  readonly modelId: string;
  readonly executionMode: 'local-placeholder' | 'local-runtime';
  getStatus(): Promise<GemmaRuntimeStatus>;
  warmup(): Promise<void>;
  isAvailable(): Promise<boolean>;
}
