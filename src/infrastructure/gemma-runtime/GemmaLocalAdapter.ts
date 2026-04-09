import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import { GemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import { isGemmaRuntimeReady } from '@domain/service-contracts/GemmaRuntimeStatus';
import type { LLMGenerationInput } from '@domain/service-contracts/LLMService';
import {
  gemmaRuntimeModule,
  type GemmaNativeRuntimeRequirements,
  type GemmaNativeStatusPayload,
} from '@infrastructure/gemma-runtime/GemmaRuntimeModule';
import { gemmaModelManifest } from '@infrastructure/gemma-runtime/GemmaRuntimeManifest';
import {
  ensureBundledModelInstalled,
} from '@infrastructure/gemma-runtime/ensureBundledModelInstalled';
import {
  beginLlamaNativeLogCapture,
  diagnoseLlamaFailure,
  inspectLlamaModelInfo,
} from '@infrastructure/gemma-runtime/llamaDiagnostics';
import {
  detectLlamaRuntimeIssue,
  generateWithLlamaContext,
  warmupLlamaContext,
} from '@infrastructure/gemma-runtime/llamaContextManager';
import { createGemmaPrompt } from '@infrastructure/gemma-runtime/prompting';
import type { LocalModelTarget } from '@shared/config/modelConfig';
import { logDev } from '@shared/utils/debug';

export class GemmaLocalAdapter implements GemmaAdapter {
  readonly provider = 'gemma' as const;
  readonly executionMode = 'local-runtime' as const;
  readonly modelId: string;
  private lastWarmupFailureStatus: GemmaRuntimeStatus | null = null;

  constructor(private readonly targetModel: LocalModelTarget) {
    this.modelId = targetModel.modelId;
  }

  private getRuntimeRequirements(): GemmaNativeRuntimeRequirements {
    return {
      allowEmulator: this.targetModel.runtime.deviceRequirements.allowEmulator,
      minTotalMemoryBytes: this.targetModel.runtime.deviceRequirements.minTotalMemoryBytes,
      supportedAbis: this.targetModel.runtime.deviceRequirements.supportedAbis,
      maxContextTokens: this.targetModel.runtime.maxContextTokens,
    };
  }

  private async getStatusInternal(ignoreWarmupCache = false): Promise<GemmaRuntimeStatus> {
    const sourcePresent = gemmaModelManifest.source.present;
    const artifactPresent = gemmaModelManifest.android.present;

    if (!sourcePresent) {
      return {
        code: 'source_missing',
        modelId: this.modelId,
        executionMode: this.executionMode,
        sourcePresent,
        artifactPresent,
        bundledAssetPresent: false,
        deviceModelPresent: false,
        message: 'The repo-local Hugging Face source model is missing. Run npm run model:download.',
      };
    }

    if (!artifactPresent) {
      return {
        code: 'artifact_missing',
        modelId: this.modelId,
        executionMode: this.executionMode,
        sourcePresent,
        artifactPresent,
        bundledAssetPresent: false,
        deviceModelPresent: false,
        message:
          'The Android GGUF artifact is missing. Run npm run model:download:android, then npm run model:stage:android.',
      };
    }

    if (!gemmaRuntimeModule) {
      return {
        code: 'native_module_missing',
        modelId: this.modelId,
        executionMode: this.executionMode,
        sourcePresent,
        artifactPresent,
        bundledAssetPresent: false,
        deviceModelPresent: false,
        message:
          'The native Gemma runtime module is unavailable. Use an Expo Android development build instead of Expo Go.',
      };
    }

    try {
      const installResult = await ensureBundledModelInstalled(this.targetModel);
      if (installResult?.code === 'install_failed') {
        return {
          code: 'runtime_error',
          modelId: this.modelId,
          executionMode: this.executionMode,
          sourcePresent,
          artifactPresent,
          bundledAssetPresent: installResult.bundledAssetPresent,
          deviceModelPresent: installResult.deviceModelPresent,
          message: installResult.message,
        };
      }

      const nativeStatus = (await gemmaRuntimeModule.getStatus(
        this.modelId,
        this.targetModel.repoLocal.bundledAndroidAssetPath,
        gemmaModelManifest.android.deviceModelPath,
        this.getRuntimeRequirements(),
      )) as GemmaNativeStatusPayload;

      const resolvedStatus: GemmaRuntimeStatus = {
        code: nativeStatus.code,
        modelId: this.modelId,
        executionMode: this.executionMode,
        sourcePresent,
        artifactPresent,
        bundledAssetPresent: nativeStatus.bundledAssetPresent,
        deviceModelPresent: nativeStatus.deviceModelPresent,
        message: nativeStatus.message,
        deviceProfile: nativeStatus.deviceProfile,
      };

      if (nativeStatus.code !== 'ready') {
        this.lastWarmupFailureStatus = null;
        return resolvedStatus;
      }

      if (this.lastWarmupFailureStatus && !ignoreWarmupCache) {
        return {
          ...this.lastWarmupFailureStatus,
          deviceProfile: nativeStatus.deviceProfile,
          deviceModelPresent: nativeStatus.deviceModelPresent,
          bundledAssetPresent: nativeStatus.bundledAssetPresent,
          sourcePresent,
          artifactPresent,
        };
      }

      return resolvedStatus;
    } catch (error) {
      this.lastWarmupFailureStatus = null;
      return {
        code: 'runtime_error',
        modelId: this.modelId,
        executionMode: this.executionMode,
        sourcePresent,
        artifactPresent,
        bundledAssetPresent: false,
        deviceModelPresent: false,
        message: error instanceof Error ? error.message : 'Gemma runtime status check failed.',
      };
    }
  }

  async getStatus(): Promise<GemmaRuntimeStatus> {
    return this.getStatusInternal();
  }

  async warmup() {
    const status = await this.getStatusInternal(true);
    if (!isGemmaRuntimeReady(status)) {
      throw new GemmaRuntimeError(status);
    }

    const logCapture = await beginLlamaNativeLogCapture().catch(() => null);

    try {
      await inspectLlamaModelInfo(this.targetModel);
      await warmupLlamaContext(this.targetModel);
      this.lastWarmupFailureStatus = null;
    } catch (error) {
      const nativeLogs = logCapture?.getRecentLogs() ?? [];
      const modelInfo = await inspectLlamaModelInfo(this.targetModel).catch(() => null);
      const diagnostics = diagnoseLlamaFailure({
        error,
        modelInfo,
        nativeLogs,
      });
      const failureStatus: GemmaRuntimeStatus = {
        ...status,
        code: diagnostics.code,
        message: diagnostics.message,
      };
      this.lastWarmupFailureStatus = failureStatus;

      throw new GemmaRuntimeError(failureStatus);
    } finally {
      await logCapture?.stop().catch(() => undefined);
    }
  }

  async isAvailable() {
    return isGemmaRuntimeReady(await this.getStatus());
  }

  async generateText(input: LLMGenerationInput): Promise<string> {
    const status = await this.getStatusInternal(true);
    if (!isGemmaRuntimeReady(status)) {
      throw new GemmaRuntimeError(status);
    }

    const prompt = createGemmaPrompt(input);
    const options =
      input.mode === 'answer'
        ? {
            maxTokens: this.targetModel.runtime.generation.answer.maxOutputTokens,
            temperature: this.targetModel.runtime.generation.answer.temperature,
            topK: this.targetModel.runtime.generation.answer.topK,
            topP: this.targetModel.runtime.generation.answer.topP,
          }
        : {
            maxTokens: this.targetModel.runtime.generation.summary.maxOutputTokens,
            temperature: this.targetModel.runtime.generation.summary.temperature,
            topK: this.targetModel.runtime.generation.summary.topK,
            topP: this.targetModel.runtime.generation.summary.topP,
        };
    const generationStartedAt = Date.now();

    logDev('gemma-runtime', 'Starting local text generation', {
      mode: input.mode,
      promptLength: prompt.length,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      topK: options.topK,
      topP: options.topP,
    });

    try {
      await this.warmup();
      const output = await generateWithLlamaContext(this.targetModel, prompt, options);

      logDev('gemma-runtime', 'Local text generation completed', {
        mode: input.mode,
        durationMs: Date.now() - generationStartedAt,
        outputLength: output.length,
      });

      return output;
    } catch (error) {
      logDev('gemma-runtime', 'Local text generation failed', {
        mode: input.mode,
        durationMs: Date.now() - generationStartedAt,
        message: error instanceof Error ? error.message : 'Gemma text generation failed.',
      });

      if (error instanceof GemmaRuntimeError) {
        throw error;
      }

      throw new GemmaRuntimeError({
        ...status,
        code: detectLlamaRuntimeIssue(error),
        message: error instanceof Error ? error.message : 'Gemma text generation failed.',
      });
    }
  }
}
