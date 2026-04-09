export interface GemmaRuntimeRequirements {
  allowEmulator: boolean;
  minTotalMemoryBytes: number;
  supportedAbis: readonly string[];
  maxContextTokens: number;
}

export interface GemmaRuntimeStatusPayload {
  code:
    | 'ready'
    | 'artifact_invalid'
    | 'artifact_incompatible'
    | 'device_model_missing'
    | 'insufficient_memory'
    | 'emulator_not_supported'
    | 'native_module_missing'
    | 'unsupported_platform'
    | 'runtime_error';
  message: string;
  bundledAssetPresent: boolean;
  deviceModelPresent: boolean;
  deviceProfile?: {
    isEmulator: boolean | null;
    totalMemoryBytes: number | null;
    availableMemoryBytes: number | null;
    supportedAbi: string | null;
  };
}

export interface GemmaRuntimeInstallPayload {
  code:
    | 'already_available'
    | 'bundled_asset_missing'
    | 'installed'
    | 'install_failed'
    | 'native_module_missing';
  message: string;
  bundledAssetPresent: boolean;
  deviceModelPresent: boolean;
  bytesCopied: number | null;
}

export interface GemmaRuntimeNativeModule {
  ensureBundledModelInstalled(
    modelId: string,
    bundledAssetPath: string,
    deviceModelPath: string,
  ): Promise<GemmaRuntimeInstallPayload>;
  getStatus(
    modelId: string,
    bundledAssetPath: string,
    deviceModelPath: string,
    requirements: GemmaRuntimeRequirements,
  ): Promise<GemmaRuntimeStatusPayload>;
}

export declare const getGemmaRuntimeModule: () => GemmaRuntimeNativeModule | null;
