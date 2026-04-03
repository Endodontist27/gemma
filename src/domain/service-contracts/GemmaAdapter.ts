import type { LLMService } from '@domain/service-contracts/LLMService';

export interface GemmaAdapter extends LLMService {
  readonly provider: 'gemma';
  readonly modelId: string;
  readonly executionMode: 'local-placeholder' | 'local-runtime';
  isAvailable(): Promise<boolean>;
}
