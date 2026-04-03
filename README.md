# Lecture Companion

Lecture Companion is a professional offline-first mobile app foundation for audience members in live lectures. The app runs fully on device with no backend, no authentication, no cloud sync, and no external APIs. Every answer is grounded only in local lecture data imported into the device.

## Purpose

- import a lecture pack onto the device
- persist the full lecture session graph locally in SQLite
- answer only from grounded lecture materials, glossary entries, and transcript content
- keep notes, bookmarks, summaries, and seeded public Q&A local to the device

## Offline-First Design

- SQLite is the only persistence layer.
- The first bootstrap imports the bundled demo lecture pack when the database is empty.
- No network calls are required at runtime.
- `google/gemma-4-E2B-it` is the configured local Gemma target model ID.
- Unsupported questions return an explicit unsupported state instead of speculative chat behavior.
- Web is intentionally rendered as an unsupported shell because the production target is native mobile and the SQLite stack is mobile-only.

## Architecture Layers

- `src/app`
  Expo Router route files, lightweight app bootstrap entry points, and app-level context.
- `src/presentation`
  Minimal screens, view-model hooks, and reusable components.
- `src/application`
  Use-cases, orchestrators, DTOs, and application ports.
- `src/domain`
  Entities, value objects, repository contracts, service contracts, and business rules.
- `src/infrastructure`
  Drizzle/SQLite implementation, repositories, lecture-pack import, local storage, retrieval engine, and mock services.
- `src/shared`
  Config, constants, utilities, and the concrete container assembly kept outside the Expo Router scan path.

More detail is in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Local Database

The app uses `expo-sqlite` with Drizzle ORM. The schema is split by bounded context under `src/infrastructure/database/schema/`, and the runtime migration payload is generated into `src/infrastructure/database/migrations/appMigrations.ts`.

Core tables:

- `lecture_sessions`
- `lecture_materials`
- `material_chunks`
- `glossary_terms`
- `transcript_entries`
- `summaries`
- `qa_categories`
- `questions`
- `answers`
- `answer_sources`
- `notes`
- `bookmarks`

More detail is in [DATABASE.md](./DATABASE.md).

## Lecture Pack Import

Lecture packs are JSON files validated with Zod and imported through `LecturePackImporter`.

Included sample pack:

- `src/infrastructure/lecture-pack/sample-data/lecture-companion-demo.pack.json`

Import flow:

1. parse and validate the JSON pack
2. build an in-memory session graph
3. resolve public Q&A source references against local lecture entities
4. persist the full graph transactionally

Invalid source references fail before any database transaction begins.

## Grounded RAG Boundaries

This app is intentionally not a free-form chatbot.

- answers must be grounded only in local lecture content
- source priority is fixed: glossary, then lecture materials, then transcript
- unsupported questions return a clear unsupported answer state
- no outside knowledge, no cloud retrieval, and no speculative assistant behavior is allowed

## Gemma 4 Target

The app is currently designed around `google/gemma-4-E2B-it` as the intended local Gemma 4 model. We treat it as the primary target because the published Gemma 4 lineup currently lists E2B as the smallest Gemma 4 size, and `google/gemma-4-E2B-it` is the instruction-tuned checkpoint for that size.

- `src/shared/config/modelConfig.ts` is the single place that selects the primary model target.
- `LLMService` remains the app-facing text generation contract.
- `GemmaAdapter` is the infrastructure seam for local Gemma execution.
- `GemmaLocalAdapter` is now wired specifically to `google/gemma-4-E2B-it`.
- `resolveLLMService()` prefers the Gemma adapter when it becomes available and falls back to the current mock implementation while local inference is not attached.
- If mobile packaging later needs a different on-device runtime or model format, the adapter backend can change without rewriting app logic.
- True phone-local deployment feasibility still depends on runtime overhead, usable context size, memory pressure, battery impact, and platform tooling maturity.

## Quality Gates

- strict TypeScript
- ESLint + Prettier + EditorConfig
- Vitest unit coverage for importer validation, grounded QA atomicity, retrieval priority, and repository ordering
- `npm run check` runs `typecheck`, `lint`, and `test`

## Run Locally

```bash
npm install
npm run db:generate
npm run check
npm run start
npm run android
# or
npm run ios
```

## Project Snapshot

```text
src/
  app/
    (tabs)/
    bootstrap/
    navigation/
  presentation/
    components/
    hooks/
    screens/
    view-models/
  application/
    dto/
    orchestrators/
    ports/
    use-cases/
  domain/
    business-rules/
    entities/
    repository-contracts/
    service-contracts/
    value-objects/
  infrastructure/
    database/
      mappers/
      migrations/
      schema/
    lecture-pack/
      import/
      sample-data/
    local-storage/
    mock-llm-services/
    repositories/
    retrieval-engine/
  shared/
    config/
      bootstrap/
    constants/
    types/
    utils/
test/
  application/
  infrastructure/
```
