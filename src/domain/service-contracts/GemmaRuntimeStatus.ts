export type GemmaRuntimeStatusCode =
  | 'ready'
  | 'warmup_failed'
  | 'source_missing'
  | 'artifact_missing'
  | 'artifact_invalid'
  | 'artifact_incompatible'
  | 'device_model_missing'
  | 'insufficient_memory'
  | 'emulator_not_supported'
  | 'native_module_missing'
  | 'unsupported_platform'
  | 'runtime_error';

export interface GemmaRuntimeDeviceProfile {
  isEmulator: boolean | null;
  totalMemoryBytes: number | null;
  availableMemoryBytes: number | null;
  supportedAbi: string | null;
}

export interface GemmaRuntimeStatus {
  code: GemmaRuntimeStatusCode;
  modelId: string;
  executionMode: 'local-placeholder' | 'local-runtime';
  sourcePresent: boolean;
  artifactPresent: boolean;
  bundledAssetPresent: boolean;
  deviceModelPresent: boolean;
  message: string;
  deviceProfile?: GemmaRuntimeDeviceProfile;
}

export const isGemmaRuntimeReady = (status: GemmaRuntimeStatus) => status.code === 'ready';
