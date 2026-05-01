import { Platform } from 'react-native';

import type { DesktopModelTarget } from '@shared/config/modelConfig';

const ANDROID_EMULATOR_HOST_ALIAS = '10.0.2.2';

export const buildDesktopBridgeBaseUrl = (targetModel: DesktopModelTarget) => {
  const configuredHost = targetModel.runtime.bridge.host;
  const runtimeHost =
    Platform.OS === 'android' && configuredHost === '127.0.0.1'
      ? ANDROID_EMULATOR_HOST_ALIAS
      : configuredHost;

  return `http://${runtimeHost}:${targetModel.runtime.bridge.port}`;
};
