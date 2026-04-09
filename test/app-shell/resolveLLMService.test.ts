import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import { GemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import type { LLMService } from '@domain/service-contracts/LLMService';

const reactNativeMock = vi.hoisted(() => ({
  Platform: {
    OS: 'android',
  },
}));

vi.mock('react-native', () => reactNativeMock);

const readyStatus: GemmaRuntimeStatus = {
  code: 'ready',
  modelId: 'google/gemma-4-E2B-it',
  executionMode: 'local-runtime',
  sourcePresent: true,
  artifactPresent: true,
  bundledAssetPresent: false,
  deviceModelPresent: true,
  message: 'ready',
};

const unavailableStatus: GemmaRuntimeStatus = {
  ...readyStatus,
  code: 'artifact_missing',
  artifactPresent: false,
  deviceModelPresent: false,
  message: 'artifact missing',
};

const createAdapter = (status: GemmaRuntimeStatus): GemmaAdapter => ({
  provider: 'gemma',
  modelId: status.modelId,
  executionMode: status.executionMode,
  getStatus: vi.fn().mockResolvedValue(status),
  warmup: vi.fn().mockResolvedValue(undefined),
  isAvailable: vi.fn().mockResolvedValue(status.code === 'ready'),
  generateText: vi.fn().mockResolvedValue('gemma output'),
});

const createFallback = (): LLMService => ({
  generateText: vi.fn().mockResolvedValue('fallback output'),
});

describe('resolveLLMService', () => {
  beforeEach(() => {
    reactNativeMock.Platform.OS = 'android';
  });

  it('throws instead of silently falling back on Android when Gemma is unavailable', async () => {
    const { resolveLLMService } = await import('@/app-shell/bootstrap/resolveLLMService');
    const gemmaAdapter = createAdapter(unavailableStatus);
    const fallback = createFallback();
    const llmService = resolveLLMService(gemmaAdapter, fallback);

    await expect(
      llmService.generateText({
        mode: 'answer',
        instruction: 'Answer from evidence only.',
        evidence: ['Glossary: grounded answer'],
      }),
    ).rejects.toBeInstanceOf(GemmaRuntimeError);

    expect(fallback.generateText).not.toHaveBeenCalled();
  });

  it('uses the fallback on non-Android platforms when Gemma is unavailable', async () => {
    reactNativeMock.Platform.OS = 'web';
    const { resolveLLMService } = await import('@/app-shell/bootstrap/resolveLLMService');
    const gemmaAdapter = createAdapter(unavailableStatus);
    const fallback = createFallback();
    const llmService = resolveLLMService(gemmaAdapter, fallback);

    await expect(
      llmService.generateText({
        mode: 'summary',
        instruction: 'Summarize from evidence only.',
        evidence: ['Transcript: local summary'],
      }),
    ).resolves.toBe('fallback output');
  });
});
