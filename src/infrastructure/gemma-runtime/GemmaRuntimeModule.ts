import { getGemmaRuntimeModule } from 'gemma-runtime';

export interface GemmaNativeStatusPayload {
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

export interface GemmaNativeInstallPayload {
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

export interface GemmaNativeRuntimeRequirements {
  allowEmulator: boolean;
  minTotalMemoryBytes: number;
  supportedAbis: readonly string[];
  maxContextTokens: number;
}

export const gemmaRuntimeModule = getGemmaRuntimeModule();
