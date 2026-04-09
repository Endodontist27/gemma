import { Directory, File, Paths } from 'expo-file-system';
import type { LlamaContext } from 'llama.rn';

import type { GemmaRuntimeStatus } from '@domain/service-contracts/GemmaRuntimeStatus';
import type { LocalModelTarget } from '@shared/config/modelConfig';
import { logDev } from '@shared/utils/debug';

let activeContext: LlamaContext | null = null;
let activeContextPromise: Promise<LlamaContext> | null = null;
let activeModelUri: string | null = null;

const stopSequences = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|END_OF_TURN_TOKEN|>',
];

const getArtifactFile = (relativePath: string) => {
  const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalizedPath.split('/').filter(Boolean);
  const fileName = segments.pop();

  if (!fileName) {
    throw new Error('The Gemma device model path is empty.');
  }

  let directory = Paths.document;
  for (const segment of segments) {
    directory = new Directory(directory, segment);
  }

  return new File(directory, fileName);
};

const loadLlamaModule = async () => import('llama.rn');

const mapLlamaLoadErrorToStatusCode = (error: unknown): GemmaRuntimeStatus['code'] => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (
    message.includes('native module') ||
    message.includes('turbo module') ||
    message.includes('cannot find native')
  ) {
    return 'native_module_missing';
  }

  if (message.includes('gguf') || message.includes('model')) {
    return 'artifact_invalid';
  }

  return 'runtime_error';
};

export const resolveDeviceModelUri = (targetModel: LocalModelTarget) =>
  getArtifactFile(targetModel.repoLocal.deviceModelPath).uri;

export const warmupLlamaContext = async (targetModel: LocalModelTarget) => {
  const modelUri = resolveDeviceModelUri(targetModel);

  if (activeContext && activeModelUri === modelUri) {
    return activeContext;
  }

  if (activeContextPromise && activeModelUri === modelUri) {
    return activeContextPromise;
  }

  activeModelUri = modelUri;
  activeContextPromise = (async () => {
    const { initLlama, releaseAllLlama } = await loadLlamaModule();

    if (activeContext) {
      await activeContext.release().catch(() => undefined);
      activeContext = null;
    }

    await releaseAllLlama().catch(() => undefined);

    const context = await initLlama({
      model: modelUri,
      n_ctx: targetModel.runtime.maxContextTokens,
      n_batch: targetModel.runtime.llamaCpp.nBatch,
      n_ubatch: targetModel.runtime.llamaCpp.nUBatch,
      n_parallel: targetModel.runtime.llamaCpp.nParallel,
      n_threads: targetModel.runtime.llamaCpp.nThreads,
      n_gpu_layers: targetModel.runtime.llamaCpp.nGpuLayers,
      no_gpu_devices: targetModel.runtime.llamaCpp.forceCpuOnly,
      cache_type_k: targetModel.runtime.llamaCpp.cacheTypeK,
      cache_type_v: targetModel.runtime.llamaCpp.cacheTypeV,
      use_mmap: targetModel.runtime.llamaCpp.useMmap,
      use_mlock: targetModel.runtime.llamaCpp.useMlock,
      no_extra_bufts: targetModel.runtime.llamaCpp.noExtraBufferTypes,
      ctx_shift: false,
    });

    activeContext = context;
    return context;
  })();

  try {
    return await activeContextPromise;
  } finally {
    activeContextPromise = null;
  }
};

export const generateWithLlamaContext = async (
  targetModel: LocalModelTarget,
  prompt: string,
  options: {
    maxTokens: number;
    temperature: number;
    topK: number;
    topP: number;
  },
) => {
  const context = await warmupLlamaContext(targetModel);
  await context.clearCache(false);
  const result = await context.completion({
    prompt,
    jinja: false,
    n_predict: options.maxTokens,
    n_threads: targetModel.runtime.llamaCpp.nThreads,
    top_k: options.topK,
    top_p: options.topP,
    temperature: options.temperature,
    stop: stopSequences,
  });

  logDev('gemma-runtime', 'Native completion timings', {
    promptTokens: result.timings.prompt_n,
    promptMs: result.timings.prompt_ms,
    predictedTokens: result.timings.predicted_n,
    predictedMs: result.timings.predicted_ms,
    predictedPerSecond: result.timings.predicted_per_second,
    stoppedLimit: result.stopped_limit,
    contextFull: result.context_full,
  });

  return result.text.trim();
};

export const detectLlamaRuntimeIssue = mapLlamaLoadErrorToStatusCode;
