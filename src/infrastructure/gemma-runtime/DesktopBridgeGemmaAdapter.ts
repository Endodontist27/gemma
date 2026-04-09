import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import { GemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import { isGemmaRuntimeReady } from '@domain/service-contracts/GemmaRuntimeStatus';
import type { LLMGenerationInput } from '@domain/service-contracts/LLMService';
import { createGemmaPrompt } from '@infrastructure/gemma-runtime/prompting';
import type { DesktopModelTarget } from '@shared/config/modelConfig';
import { logDev } from '@shared/utils/debug';

interface DesktopBridgeStatusPayload {
  ok: boolean;
  modelId: string;
  sourcePresent: boolean;
  artifactPresent: boolean;
  bundledAssetPresent?: boolean;
  deviceModelPresent?: boolean;
  message: string;
}

interface DesktopBridgeGeneratePayload {
  output: string;
}

const createTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timer),
  };
};

export class DesktopBridgeGemmaAdapter implements GemmaAdapter {
  readonly provider = 'gemma' as const;
  readonly executionMode = 'local-runtime' as const;
  readonly modelId: string;
  private readonly baseUrl: string;

  constructor(private readonly targetModel: DesktopModelTarget) {
    this.modelId = targetModel.modelId;
    this.baseUrl = `http://${targetModel.runtime.bridge.host}:${targetModel.runtime.bridge.port}`;
  }

  private buildUnavailableStatus(message: string): GemmaRuntimeStatus {
    return {
      code: 'runtime_error',
      modelId: this.modelId,
      executionMode: this.executionMode,
      sourcePresent: true,
      artifactPresent: true,
      bundledAssetPresent: false,
      deviceModelPresent: false,
      message,
    };
  }

  private async requestJson<T>(path: string, init?: RequestInit, timeoutMs = 10_000): Promise<T> {
    const timeout = createTimeoutSignal(timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
        signal: timeout.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Bridge request failed with status ${response.status}.`);
      }

      return (await response.json()) as T;
    } finally {
      timeout.dispose();
    }
  }

  async getStatus(): Promise<GemmaRuntimeStatus> {
    try {
      const payload = await this.requestJson<DesktopBridgeStatusPayload>('/status');
      return {
        code: payload.ok ? 'ready' : 'runtime_error',
        modelId: payload.modelId,
        executionMode: this.executionMode,
        sourcePresent: payload.sourcePresent,
        artifactPresent: payload.artifactPresent,
        bundledAssetPresent: payload.bundledAssetPresent ?? false,
        deviceModelPresent: payload.deviceModelPresent ?? false,
        message: payload.message,
      };
    } catch (error) {
      return this.buildUnavailableStatus(
        error instanceof Error
          ? `Desktop E4B bridge is not reachable at ${this.baseUrl}. ${error.message}`
          : `Desktop E4B bridge is not reachable at ${this.baseUrl}.`,
      );
    }
  }

  async warmup(): Promise<void> {
    try {
      const payload = await this.requestJson<DesktopBridgeStatusPayload>(
        '/warmup',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        120_000,
      );

      if (!payload.ok) {
        throw new GemmaRuntimeError(this.buildUnavailableStatus(payload.message));
      }
    } catch (error) {
      if (error instanceof GemmaRuntimeError) {
        throw error;
      }

      throw new GemmaRuntimeError(
        this.buildUnavailableStatus(
          error instanceof Error
            ? `Desktop E4B bridge warmup failed. ${error.message}`
            : 'Desktop E4B bridge warmup failed.',
        ),
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    return isGemmaRuntimeReady(await this.getStatus());
  }

  async generateText(input: LLMGenerationInput): Promise<string> {
    await this.warmup();

    const generation =
      input.mode === 'answer'
        ? this.targetModel.runtime.generation.answer
        : this.targetModel.runtime.generation.summary;
    const maxTokens =
      input.mode === 'answer' && input.visualEvidence?.length
        ? Math.min(generation.maxOutputTokens, 512)
        : generation.maxOutputTokens;
    const prompt = createGemmaPrompt(input, {
      evidence: {
        answer: input.visualEvidence?.length
          ? {
              maxItems: Math.min(this.targetModel.runtime.reasoning.answerEvidence.maxItems, 10),
              maxChars: Math.min(this.targetModel.runtime.reasoning.answerEvidence.maxChars, 900),
            }
          : this.targetModel.runtime.reasoning.answerEvidence,
        summary: this.targetModel.runtime.reasoning.summaryEvidence,
      },
      answer: {
        requireFullEvidenceReview: true,
        encourageDeliberateReasoning: this.targetModel.runtime.reasoning.enableThinkingByDefault,
        sentenceGuidance:
          'Write 4 to 7 grounded sentences that directly answer the question, combine the most relevant uploaded lecture evidence, and stay precise.',
      },
    });
    const systemPrompt =
      input.mode === 'answer'
        ? input.visualEvidence?.length
          ? 'You are Lecture Companion. Read every provided lecture evidence block carefully, inspect the attached lecture visuals, reason privately, synthesize the uploaded lecture materials faithfully, and return only the final grounded answer.'
          : 'You are Lecture Companion. Read every provided lecture evidence block carefully, reason privately, synthesize the uploaded lecture materials faithfully, and return only the final grounded answer.'
        : 'You are Lecture Companion. Review the full uploaded lecture evidence carefully, reason privately, and return only the final grounded summary.';

    logDev('gemma-bridge', 'Starting desktop E4B generation', {
      mode: input.mode,
      modelId: this.modelId,
      promptLength: prompt.length,
      quantization: this.targetModel.runtime.defaultQuantization,
      thinkingEnabled: this.targetModel.runtime.reasoning.enableThinkingByDefault,
      evidenceCount: input.evidence.length,
      visualEvidenceCount: input.visualEvidence?.length ?? 0,
      maxTokens,
    });

    try {
      const payload = await this.requestJson<DesktopBridgeGeneratePayload>(
        '/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            mode: input.mode,
            systemPrompt,
            prompt,
            options: {
              maxTokens,
              temperature: generation.temperature,
              topK: generation.topK,
              topP: generation.topP,
            },
            imageDataUris: input.visualEvidence?.map((entry) => entry.uri) ?? [],
          }),
        },
        300_000,
      );

      logDev('gemma-bridge', 'Desktop E4B generation completed', {
        mode: input.mode,
        modelId: this.modelId,
        outputLength: payload.output.length,
      });

      return payload.output;
    } catch (error) {
      throw new GemmaRuntimeError(
        this.buildUnavailableStatus(
          error instanceof Error
            ? `Desktop E4B bridge generation failed. ${error.message}`
            : 'Desktop E4B bridge generation failed.',
        ),
      );
    }
  }
}
