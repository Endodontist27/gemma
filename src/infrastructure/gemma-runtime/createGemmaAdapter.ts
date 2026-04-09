import type { GemmaAdapter } from '@domain/service-contracts/GemmaAdapter';
import { DevAwareGemmaAdapter } from '@infrastructure/gemma-runtime/DevAwareGemmaAdapter';
import { DesktopBridgeGemmaAdapter } from '@infrastructure/gemma-runtime/DesktopBridgeGemmaAdapter';
import { GemmaLocalAdapter } from '@infrastructure/gemma-runtime/GemmaLocalAdapter';
import { UnsupportedPlatformGemmaAdapter } from '@infrastructure/gemma-runtime/UnsupportedPlatformGemmaAdapter';
import { modelConfig, type LocalModelTarget } from '@shared/config/modelConfig';
import { Platform } from 'react-native';

export const createGemmaAdapter = (targetModel: LocalModelTarget): GemmaAdapter =>
  Platform.OS === 'android'
    ? __DEV__
      ? new DevAwareGemmaAdapter(
          new GemmaLocalAdapter(targetModel),
          new DesktopBridgeGemmaAdapter(modelConfig.desktopDemo),
        )
      : new GemmaLocalAdapter(targetModel)
    : new UnsupportedPlatformGemmaAdapter(targetModel);
