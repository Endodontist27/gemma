let cachedModule;
let didResolve = false;

function getPdfTextExtractorModule() {
  if (didResolve) {
    return cachedModule;
  }

  didResolve = true;

  try {
    const { requireNativeModule } = require('expo-modules-core');
    cachedModule = requireNativeModule('PdfTextExtractor');
  } catch (_error) {
    cachedModule = null;
  }

  return cachedModule;
}

module.exports = {
  getPdfTextExtractorModule,
};
