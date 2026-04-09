import type { GemmaNativeInstallPayload } from '@infrastructure/gemma-runtime/GemmaRuntimeModule';
import { gemmaRuntimeModule } from '@infrastructure/gemma-runtime/GemmaRuntimeModule';
import type { LocalModelTarget } from '@shared/config/modelConfig';
import { logDev } from '@shared/utils/debug';

export const ensureBundledModelInstalled = async (
  targetModel: LocalModelTarget,
): Promise<GemmaNativeInstallPayload | null> => {
  if (!gemmaRuntimeModule?.ensureBundledModelInstalled) {
    return null;
  }

  const result = await gemmaRuntimeModule.ensureBundledModelInstalled(
    targetModel.modelId,
    targetModel.repoLocal.bundledAndroidAssetPath,
    targetModel.repoLocal.deviceModelPath,
  );

  if (result.code === 'installed') {
    logDev('gemma-runtime', 'Installed bundled Gemma model into app storage', {
      bytesCopied: result.bytesCopied,
    });
  } else if (result.code === 'already_available') {
    logDev('gemma-runtime', 'Bundled Gemma model already available in app storage');
  } else if (result.code === 'bundled_asset_missing') {
    logDev('gemma-runtime', 'No bundled Gemma model asset was packaged into this build');
  } else {
    logDev('gemma-runtime', 'Bundled Gemma install failed', {
      code: result.code,
      message: result.message,
    });
  }

  return result;
};
