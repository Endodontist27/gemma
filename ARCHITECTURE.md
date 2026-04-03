# Architecture

## Layer Map

```text
src/
  app/
    _layout.tsx
    (tabs)/
      _layout.tsx
      index.tsx
      live.tsx
      ask.tsx
      community.tsx
      materials.tsx
      notes.tsx
    bootstrap/
      AppBootstrapGate.tsx
      AppContainerContext.tsx
      createAppContainer.ts
      createOrchestrators.ts
      createRepositories.ts
      createServices.ts
      createUseCases.ts
      demoPack.ts
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
        appMigrations.ts
      ordering.ts
      schema/
      serializers.ts
    lecture-pack/
      import/
      sample-data/
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
test/
  application/
  infrastructure/
```

## Responsibilities

### `src/app`

- owns Expo Router route files and app-level bootstrap entry points
- exposes the public bootstrap/context API used by the route tree
- keeps router-visible bootstrap files lightweight so web can render an unsupported shell without loading SQLite

### `src/presentation`

- renders minimal navigable screens only
- keeps components thin and pushes screen behavior into view-model hooks
- stores UI-level state in Zustand: active session, bootstrap status, and content refresh versioning

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
- implements local retrieval, mock summarization, mock categorization, grounded Q&A, local session selection, and transaction-backed QA persistence

### `src/shared`

- holds small cross-cutting config and utilities
- owns the swappable model target configuration in `modelConfig.ts`
- contains the concrete container assembly outside the Expo Router scan path
- avoids pushing runtime composition into the presentation layer

## Dependency Direction

```text
presentation -> application -> domain
infrastructure -> application + domain
app -> presentation + application + infrastructure
shared -> any layer when the dependency is generic and non-domain-specific
```

The domain layer does not depend on presentation or infrastructure. The application layer does not import SQLite, Drizzle, Expo Router, or file storage directly.

## Bootstrap Composition

The public app entry points live in `src/app/bootstrap/`, but the concrete container assembly lives in `src/shared/config/bootstrap/`.

Why:

- Expo Router scans the `src/app` tree.
- Keeping the heavy composition outside that tree prevents the web bundle from pulling the native SQLite runtime.
- The app layer still remains the public bootstrapping boundary, but native-only internals are isolated behind lightweight wrappers.

## Runtime Flow

### App bootstrap

1. `src/app/_layout.tsx` renders a native bootstrap gate on mobile and an unsupported shell on web.
2. `AppBootstrapGate` creates the app container and triggers `AppBootstrapOrchestrator`.
3. `AppBootstrapOrchestrator` calls `DatabaseInitializer`, imports the bundled demo pack when needed, ensures summaries exist, and restores the selected session from `SelectedSessionStore`.
4. The tabs render only after bootstrap completes.

### Asking a question

1. `AskScreen` submits through `useAskViewModel`.
2. `AskLectureQuestionUseCase` categorizes, retrieves, checks support, and builds the final supported or unsupported result before persistence.
3. `TransactionRunner` persists `question + answer + answer_sources` atomically.
4. Unsupported questions persist a question record plus an unsupported answer with zero sources.

### Importing a lecture pack

1. `LecturePackImporter` parses and validates the pack.
2. `buildSessionGraph` constructs the full session graph in memory.
3. `resolveAnswerSources` validates public Q&A source references against glossary, material chunk, and transcript entities.
4. `persistLecturePack` writes the full graph transactionally.

## Structural Decisions

### Transaction-backed QA persistence

- The Expo SQLite driver uses synchronous transactions.
- The app now performs all async retrieval and answer generation before entering the write transaction.
- The write transaction only performs local persistence work, which keeps the audit trail consistent.

### Deterministic repository ordering

- repository contracts now document ordering semantics
- repository implementations explicitly apply `orderBy` instead of relying on SQLite row order
- ordering rules are tested so list methods stay stable as the schema evolves

### Gemma readiness

- `src/shared/config/modelConfig.ts` sets `google/gemma-4-E2B-it` as the primary local model target.
- `GemmaLocalAdapter` is the current placeholder implementation for that exact model ID.
- `resolveLLMService()` remains the single selection seam between the Gemma adapter and the fallback mock LLM.
- If a later mobile packaging path needs a different on-device runtime or model format, the adapter backend can be swapped without changing application logic.
- The current design intentionally assumes local-first inference only. There are still no cloud APIs in the stack.
- Practical phone-local deployment is still conditional on runtime overhead, usable context windows, memory limits, and platform tooling support.

## Why The UI Is Still Intentionally Minimal

- the goal of this pass is structural quality, not product expansion
- the screens exist to prove real data-layer wiring end to end
- styling stays secondary until the architecture is stable
