# `google/gemma-4-E2B-it`

This directory is the only supported local Gemma model root for Lecture Companion.

Structure:

- `source/`
  Hugging Face source files for `google/gemma-4-E2B-it`.
- `android/`
  Android GGUF runtime artifacts downloaded for the exact target model family.
- `manifest.json`
  Repo-local metadata used by scripts and the app runtime status surface.

The model binaries stay inside the project tree, but they are gitignored by default because of size.

Expected workflow:

1. `npm run model:download`
2. `npm run model:download:android`
3. `npm run model:verify`
4. `npm run android:dev`
5. `npm run model:stage:android`

Notes:

- Only `google/gemma-4-E2B-it` is supported.
- The Android artifact is expected at `android/gemma-4-E2B-it-Q3_K_S.gguf`.
- The staged runtime path inside the Android app is `files/lecture-companion/gemma-4-E2B-it-Q3_K_S.gguf`.
- The current GGUF target is the standard `Q3_K_S` quant, which keeps the exact `google/gemma-4-E2B-it` base model lineage while avoiding the more aggressive unsupported quant path we tested first.
- The repo does not currently script a local GGUF quantization pipeline from the raw Hugging Face weights. The practical workflow is to keep the exact source model in `source/` and download the Android GGUF artifact repo-locally with `npm run model:download:android`.
- Bundling the model inside the APK is not the chosen path because the artifact is too large.
