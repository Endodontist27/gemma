import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import type { LocalModelTarget } from '@shared/config/modelConfig';

import { resolveDeviceModelUri } from '@infrastructure/gemma-runtime/llamaContextManager';

export interface LlamaModelInfoSnapshot {
  architecture: string | null;
  name: string | null;
}

export interface LlamaNativeLogCapture {
  getRecentLogs(): string[];
  stop(): Promise<void>;
}

const normalizeLogLine = (value: string) => value.replace(/\s+/g, ' ').trim();

export const beginLlamaNativeLogCapture = async (): Promise<LlamaNativeLogCapture> => {
  const { addNativeLogListener, toggleNativeLog } = await import('llama.rn');
  const recentLogs: string[] = [];

  const subscription = addNativeLogListener((level, text) => {
    recentLogs.push(`[${level}] ${normalizeLogLine(text)}`);
    if (recentLogs.length > 40) {
      recentLogs.shift();
    }
  });

  await toggleNativeLog(true).catch(() => undefined);

  return {
    getRecentLogs: () => [...recentLogs],
    stop: async () => {
      subscription.remove();
      await toggleNativeLog(false).catch(() => undefined);
    },
  };
};

export const inspectLlamaModelInfo = async (
  targetModel: LocalModelTarget,
): Promise<LlamaModelInfoSnapshot> => {
  const { loadLlamaModelInfo } = await import('llama.rn');
  const info = (await loadLlamaModelInfo(resolveDeviceModelUri(targetModel))) as Record<
    string,
    unknown
  >;

  return {
    architecture:
      typeof info['general.architecture'] === 'string' ? info['general.architecture'] : null,
    name: typeof info['general.name'] === 'string' ? info['general.name'] : null,
  };
};

interface LlamaFailureDiagnosticsInput {
  error: unknown;
  modelInfo: LlamaModelInfoSnapshot | null;
  nativeLogs: string[];
}

export interface LlamaFailureDiagnostics {
  code: GemmaRuntimeStatus['code'];
  message: string;
}

const findRelevantNativeLine = (nativeLogs: string[]) =>
  [...nativeLogs]
    .reverse()
    .find(
      (line) =>
        line.includes('error') ||
        line.includes('failed') ||
        line.includes('unable') ||
        line.includes('memory') ||
        line.includes('mmap') ||
        line.includes('architecture'),
    );

export const diagnoseLlamaFailure = ({
  error,
  modelInfo,
  nativeLogs,
}: LlamaFailureDiagnosticsInput): LlamaFailureDiagnostics => {
  const errorMessage =
    error instanceof Error && error.message.trim().length > 0
      ? error.message.trim()
      : 'Gemma runtime warmup failed.';
  const relevantLog = findRelevantNativeLine(nativeLogs);
  const combinedMessage = `${errorMessage} ${relevantLog ?? ''}`.trim().toLowerCase();

  if (combinedMessage.includes('failed to load model info')) {
    return {
      code: 'artifact_invalid',
      message:
        'The staged GGUF file could not be parsed by the local llama runtime. Re-stage the model artifact and try again.',
    };
  }

  if (
    combinedMessage.includes('unknown model architecture') ||
    combinedMessage.includes('unsupported architecture')
  ) {
    return {
      code: 'artifact_incompatible',
      message:
        'The staged GGUF file was found, but the bundled Android llama runtime does not support its architecture on this build.',
    };
  }

  if (
    combinedMessage.includes('cannot allocate memory') ||
    combinedMessage.includes('out of memory') ||
    combinedMessage.includes('failed to mmap') ||
    combinedMessage.includes('not enough space in the address space')
  ) {
    return {
      code: 'warmup_failed',
      message:
        'The GGUF file is present, but this device does not have enough usable memory to load the model with the current Android runtime settings.',
    };
  }

  const architectureDetail = modelInfo?.architecture
    ? ` Parsed architecture: ${modelInfo.architecture}.`
    : '';
  const nativeDetail = relevantLog ? ` Native loader: ${relevantLog}` : '';

  return {
    code: 'warmup_failed',
    message:
      `The staged GGUF file was found, but the Android llama runtime could not load it on this device.${architectureDetail}${nativeDetail}`.trim(),
  };
};
