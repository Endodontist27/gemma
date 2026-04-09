const isProduction = process.env.APP_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';

const plugins = [
  'expo-router',
  'expo-sqlite',
  [
    'llama.rn',
    {
      forceCxx20: true,
      enableOpenCLAndHexagon: false,
    },
  ],
];

if (!isProduction) {
  plugins.splice(2, 0, 'expo-dev-client');
}

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'Lecture Companion',
  slug: 'lecture-companion',
  scheme: 'lecturecompanion',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    bundleIdentifier: 'com.endodontist27.lecturecompanion',
    buildNumber: '1',
    supportsTablet: true,
  },
  android: {
    package: 'com.endodontist27.lecturecompanion',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    blockedPermissions: isProduction
      ? [
          'android.permission.SYSTEM_ALERT_WINDOW',
          'android.permission.READ_EXTERNAL_STORAGE',
          'android.permission.WRITE_EXTERNAL_STORAGE',
        ]
      : [],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins,
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnvironment: isProduction ? 'production' : 'development',
  },
};

module.exports = config;
