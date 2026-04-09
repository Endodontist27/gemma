let cachedModule;
let didResolve = false;

function getGemmaRuntimeModule() {
  if (didResolve) {
    return cachedModule;
  }

  didResolve = true;

  try {
    const { requireNativeModule } = require('expo-modules-core');
    cachedModule = requireNativeModule('GemmaRuntime');
  } catch (_error) {
    cachedModule = null;
  }

  return cachedModule;
}

module.exports = {
  getGemmaRuntimeModule,
};
