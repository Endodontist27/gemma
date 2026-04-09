import { describe, expect, it } from 'vitest';

import { GemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import { GemmaLocalAdapter } from '@infrastructure/gemma-runtime/GemmaLocalAdapter';
import { modelConfig, primaryModelId } from '@shared/config/modelConfig';

describe('GemmaLocalAdapter', () => {
  it('uses google/gemma-4-E2B-it as the primary local Gemma target', async () => {
    const adapter = new GemmaLocalAdapter(modelConfig.primary);
    const status = await adapter.getStatus();

    expect(primaryModelId).toBe('google/gemma-4-E2B-it');
    expect(modelConfig.primary.modelId).toBe(primaryModelId);
    expect(adapter.modelId).toBe(primaryModelId);
    expect(adapter.executionMode).toBe('local-runtime');
    expect(modelConfig.primary.runtime.maxContextTokens).toBe(256);
    expect(modelConfig.primary.runtime.backend).toBe('llama-cpp-rn-cpu');
    expect(modelConfig.primary.runtime.artifactFormat).toBe('gguf');
    expect(modelConfig.primary.runtime.quantization).toBe('q3_k_s');
    expect(modelConfig.primary.runtime.deviceRequirements.allowEmulator).toBe(false);
    expect(modelConfig.primary.runtime.deviceRequirements.minTotalMemoryBytes).toBe(0);
    expect(modelConfig.primary.runtime.deviceRequirements.recommendedTotalMemoryBytes).toBe(
      8 * 1024 * 1024 * 1024,
    );
    expect(modelConfig.primary.runtime.llamaCpp.forceCpuOnly).toBe(true);
    expect(modelConfig.primary.runtime.llamaCpp.nThreads).toBe(4);
    expect(modelConfig.primary.runtime.llamaCpp.nParallel).toBe(1);
    expect(modelConfig.primary.runtime.llamaCpp.nUBatch).toBe(16);
    expect(modelConfig.primary.runtime.generation.answer.maxOutputTokens).toBe(104);
    expect(modelConfig.primary.runtime.deviceRequirements.supportedAbis).toEqual(['arm64-v8a']);
    expect(modelConfig.primary.repoLocal.androidArtifactPath).toContain('.gguf');
    expect(modelConfig.primary.repoLocal.bundledAndroidAssetPath).toContain('.gguf');
    await expect(adapter.isAvailable()).resolves.toBe(status.code === 'ready');
    expect([
      'ready',
      'warmup_failed',
      'source_missing',
      'artifact_missing',
      'artifact_invalid',
      'artifact_incompatible',
      'device_model_missing',
      'insufficient_memory',
      'emulator_not_supported',
      'native_module_missing',
      'unsupported_platform',
      'runtime_error',
    ]).toContain(status.code);
  });

  it('throws a strict runtime error when the repo-local model is unavailable', async () => {
    const adapter = new GemmaLocalAdapter(modelConfig.primary);

    await expect(
      adapter.generateText({
        mode: 'answer',
        instruction: 'Answer from local evidence only.',
        evidence: [],
      }),
    ).rejects.toBeInstanceOf(GemmaRuntimeError);
  });
});
