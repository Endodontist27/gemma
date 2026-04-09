import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import type { LLMGenerationInput } from '@domain/service-contracts/LLMService';

const shouldPreferDesktopBridge = (status: GemmaRuntimeStatus) =>
  status.code === 'emulator_not_supported';

export class DevAwareGemmaAdapter implements GemmaAdapter {
  readonly provider = 'gemma' as const;
  readonly executionMode = 'local-runtime' as const;

  constructor(
    private readonly localAdapter: GemmaAdapter,
    private readonly desktopBridgeAdapter: GemmaAdapter,
  ) {}

  get modelId() {
    return this.desktopBridgeAdapter.modelId;
  }

  private async resolveAdapter() {
    const localStatus = await this.localAdapter.getStatus();
    if (!shouldPreferDesktopBridge(localStatus)) {
      return { adapter: this.localAdapter, status: localStatus };
    }

    const bridgeStatus = await this.desktopBridgeAdapter.getStatus();
    return {
      adapter: this.desktopBridgeAdapter,
      status: bridgeStatus,
      localStatus,
    };
  }

  async getStatus(): Promise<GemmaRuntimeStatus> {
    const resolved = await this.resolveAdapter();
    if (resolved.status.code === 'ready') {
      return resolved.status;
    }

    return resolved.localStatus
      ? {
          ...resolved.status,
          message: `${resolved.status.message} Local Android Gemma remains unavailable on emulators.`,
        }
      : resolved.status;
  }

  async warmup(): Promise<void> {
    const resolved = await this.resolveAdapter();
    await resolved.adapter.warmup();
  }

  async isAvailable(): Promise<boolean> {
    return (await this.getStatus()).code === 'ready';
  }

  async generateText(input: LLMGenerationInput): Promise<string> {
    const resolved = await this.resolveAdapter();
    return resolved.adapter.generateText(input);
  }
}
