import { describe, expect, it } from 'vitest';

import { GemmaLocalAdapter } from '@infrastructure/mock-llm-services/GemmaLocalAdapter';
import { modelConfig, primaryModelId } from '@shared/config/modelConfig';

describe('GemmaLocalAdapter', () => {
  it('uses google/gemma-4-E2B-it as the primary local Gemma target', async () => {
    const adapter = new GemmaLocalAdapter();

    expect(primaryModelId).toBe('google/gemma-4-E2B-it');
    expect(modelConfig.primary.modelId).toBe(primaryModelId);
    expect(adapter.modelId).toBe(primaryModelId);
    expect(adapter.executionMode).toBe('local-placeholder');
    await expect(adapter.isAvailable()).resolves.toBe(false);
  });

  it('mentions the configured model target in the placeholder error', async () => {
    const adapter = new GemmaLocalAdapter();

    await expect(
      adapter.generateText({
        mode: 'answer',
        instruction: 'Answer from local evidence only.',
        evidence: [],
      }),
    ).rejects.toThrow('google/gemma-4-E2B-it');
  });
});
