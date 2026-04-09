# Architecture

## Layer Map

```text
src/
  app/
    _layout.tsx
    _layout.web.tsx
    (tabs)/
      _layout.tsx
      index.tsx
      live.tsx
      ask.tsx
      community.tsx
      materials.tsx
      notes.tsx
  app-shell/
    bootstrap/
      AppBootstrapGate.d.ts
      AppBootstrapGate.native.tsx
      AppBootstrapGate.web.tsx
      AppContainerContext.tsx
      bootstrapLectureWorkspace.ts
      resolveLLMService.ts
      types.ts
    navigation/
      tabs.ts
  presentation/
    components/
    hooks/
      useAppStore.ts
    screens/
    view-models/
  application/
    dto/
    orchestrators/
      AppBootstrapOrchestrator.ts
      LectureExperienceOrchestrator.ts
    ports/
      DatabaseInitializer.ts
      SelectedSessionStore.ts
      TransactionRunner.ts
    use-cases/
      GetGemmaRuntimeStatusUseCase.ts
  domain/
    business-rules/
    entities/
    repository-contracts/
    service-contracts/
    value-objects/
  infrastructure/
    database/
      client.ts
      DrizzleDatabaseInitializer.ts
      DrizzleTransactionRunner.ts
      mappers/
      migrations/
      ordering.ts
      schema/
      serializers.ts
    gemma-runtime/
    ground-truth-import/
    lecture-pack/
      import/
      LecturePackImporter.ts
      lecturePack.schema.ts
    local-storage/
      FileSelectedSessionStore.ts
    mock-llm-services/
    repositories/
    retrieval-engine/
  shared/
    config/
      appConfig.ts
      modelConfig.ts
      bootstrap/
        createAppContainer.ts
        createOrchestrators.ts
        createRepositories.ts
        createServices.ts
        createUseCases.ts
    constants/
    types/
    utils/
models/
  google/
    gemma-4-E2B-it/
      source/
      android/
      manifest.json
modules/
  gemma-runtime/
    android/
  pdf-text-extractor/
    android/
scripts/
  gemma/
test/
  app-shell/
  application/
  fixtures/
  infrastructure/
  presentation/
```

## Responsibilities

### `src/app`

- owns Expo Router route files only
- keeps route files free of non-route implementation details

### `src/app-shell`

- owns bootstrapping logic, dependency container types, and runtime composition helpers
- keeps non-route bootstrap files out of the Expo Router scan path
- hosts strict Android Gemma runtime resolution and app bootstrap gating

### `src/presentation`

- renders minimal navigable screens only
- keeps components thin and pushes screen behavior into view-model hooks
- stores UI-level state in Zustand: active session and content refresh versioning

### `src/application`

- coordinates workflows through use-cases and orchestrators
- depends on repository contracts, service contracts, and application ports instead of infrastructure details
- owns `DatabaseInitializer`, `SelectedSessionStore`, and `TransactionRunner` as boundary ports

### `src/domain`

- defines the stable core model of the product
- owns repository contracts and service contracts
- encodes grounded-answer rules, source priority, and unsupported-answer behavior

### `src/infrastructure`

- implements the domain and application contracts
- persists local data with Drizzle + SQLite
- validates and imports lecture packs
- assembles lecture packs locally from grounded source file uploads
- extracts embedded text from searchable PDFs locally on Android before grounded import
- implements local retrieval, Android Gemma runtime integration, local session selection, and transaction-backed QA persistence
- owns the repo-local Gemma manifest reader and Android native bridge wrapper

### `src/shared`

- holds small cross-cutting config and utilities
- owns the strict model target configuration in `modelConfig.ts`
- contains the concrete container assembly outside the Expo Router scan path
- avoids pushing runtime composition into the presentation layer

## Dependency Direction

```text
presentation -> application -> domain
infrastructure -> application + domain
app/app-shell -> presentation + application + infrastructure
shared -> any layer when the dependency is generic and non-domain-specific
```

The domain layer does not depend on presentation or infrastructure. The application layer does not import SQLite, Drizzle, Expo Router, or file storage directly.

## Bootstrap Composition

The public route entry points live in `src/app/`, while the concrete bootstrap and runtime composition live in `src/app-shell/` and `src/shared/config/bootstrap/`.

Why:

- Expo Router scans the `src/app` tree.
- Keeping heavier bootstrap and native-runtime composition out of that tree prevents route warnings and keeps web fallback behavior predictable.
- The app layer remains the public route boundary while native-only internals stay isolated behind lightweight wrappers.

## Runtime Flow

### App bootstrap

1. `src/app/_layout.tsx` renders a native bootstrap gate on mobile and an unsupported shell on web.
2. `AppBootstrapGate` creates the app container and triggers `AppBootstrapOrchestrator`.
3. `AppBootstrapOrchestrator` initializes SQLite, checks and warms the Gemma runtime when possible, generates missing summaries when Gemma is available, and restores the selected session from `SelectedSessionStore`.
4. The tabs render only after bootstrap completes.

### Release configuration

1. `app.config.js` selects development or production behavior through `APP_ENV`.
2. Development keeps the Expo dev client plugin enabled for local device testing.
3. Production removes dev-client-only behavior, blocks development-only Android permissions, and uses the Play-facing package id `com.endodontist27.lecturecompanion`.
4. `android/app/build.gradle` requires a real release signing configuration instead of silently reusing the debug keystore.
5. `eas.json` defines the production Android App Bundle build profile used for Play submission.

### Asking a question

1. `AskScreen` submits through `useAskViewModel`.
2. `AskLectureQuestionUseCase` categorizes, retrieves, checks support, and builds the final supported or unsupported result before persistence.
3. `QuestionAnsweringService` uses `LLMService`, which resolves to strict Android Gemma runtime behavior when available.
4. `TransactionRunner` persists `question + answer + answer_sources` atomically.
5. Unsupported questions persist a question record plus an unsupported answer with zero sources.

### Importing lecture data

1. `LecturePackImporter` parses and validates the pack.
2. `buildSessionGraph` constructs the full session graph in memory.
3. `resolveAnswerSources` validates public Q&A source references against glossary, material chunk, and transcript entities.
4. `persistLecturePack` writes the full graph transactionally.

### Uploading grounded source files

1. `SessionsScreen` opens the local document picker and collects real lecture source files.
2. `ImportGroundTruthAssetsUseCase` passes those files to `GroundTruthImporter`.
3. `GroundTruthImporter` either:
   - passes through a valid lecture-pack JSON unchanged, or
   - builds a lecture-pack JSON locally from session/material/glossary/transcript source files.
4. Searchable PDFs are converted to text locally through the Android PDF extraction module before classification and lecture-pack assembly.
5. The assembled lecture pack is validated with `LecturePackDtoSchema`.
6. The validated pack flows through the same transactional lecture-pack import pipeline.

## Structural Decisions

### Transaction-backed QA persistence

- The Expo SQLite driver uses synchronous transactions.
- The app performs all async retrieval and answer generation before entering the write transaction.
- The write transaction only performs local persistence work, which keeps the audit trail consistent.

### Deterministic repository ordering

- repository contracts document ordering semantics
- repository implementations explicitly apply `orderBy` instead of relying on SQLite row order
- ordering rules are tested so list methods stay stable as the schema evolves

### Gemma runtime

- `src/shared/config/modelConfig.ts` keeps the Android app target on `google/gemma-4-E2B-it`.
- The Android model lives under `models/google/gemma-4-E2B-it/`.
- The desktop competition demo profile uses `google/gemma-4-E4B-it` under `models/google/gemma-4-E4B-it/source/`.
- Android development builds can stage a GGUF artifact over `adb`, while production builds package the selected GGUF and install it into app-private storage on first launch.
- The Android runtime executes that installed GGUF through a `llama.rn` / `llama.cpp` style backend.
- `scripts/gemma/desktop_harness.py` provides a desktop-local E4B harness for grounded prompt and output testing on an RTX 3060 12 GB class PC.
- `GemmaAdapter` exposes runtime status and warmup in addition to text generation.
- `resolveLLMService()` is strict on Android: it does not silently fall back to mock generation when the native runtime is unavailable.
- The app continues to assume local-first inference only. There are still no cloud APIs in the stack.
- Practical phone-local deployment is still conditional on runtime overhead, usable context windows, memory limits, and platform tooling support.
- The current Android artifact target is the standard `Q3_K_S` GGUF quant for the exact `google/gemma-4-E2B-it` lineage. This keeps the model in the multi-GB range, but avoids the more aggressive `UD-IQ2_M` path that failed to load through the current Android llama runtime.
- The desktop harness defaults to CUDA + bitsandbytes 4-bit NF4 for E4B on the RTX 3060 12 GB target, with `--quantization bnb-8bit` available only when the GPU has more free headroom.
- TurboQuant is not the answer for app-bundle size here. It targets KV-cache compression at runtime rather than shrinking the GGUF file that users must store on-device.
- The Android status bridge still isolates device capability, packaged-asset installation, and installed-file checks behind `GemmaAdapter`, so the application layer can survive future GGUF backend swaps without being rewritten.

## Why The UI Is Still Intentionally Minimal

- the goal of this pass is structural quality and runtime correctness, not product expansion
- the screens exist to prove real data-layer wiring end to end
- styling stays secondary until the architecture and local model path are stable
