import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';

export class GemmaRuntimeError extends Error {
  constructor(readonly status: GemmaRuntimeStatus) {
    super(status.message);
    this.name = 'GemmaRuntimeError';
  }
}

export const isGemmaRuntimeError = (error: unknown): error is GemmaRuntimeError =>
  error instanceof GemmaRuntimeError;
