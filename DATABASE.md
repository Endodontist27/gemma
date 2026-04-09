# Database

Lecture Companion uses SQLite on device with Drizzle ORM. The schema is organized by bounded context under `src/infrastructure/database/schema/`, and runtime migrations are generated into `src/infrastructure/database/migrations/appMigrations.ts`.

## Schema Layout

```text
src/infrastructure/database/
  client.ts
  DrizzleDatabaseInitializer.ts
  DrizzleTransactionRunner.ts
  mappers/
    content.ts
    notes.ts
    qa.ts
    session.ts
    index.ts
  migrations/
    appMigrations.ts
  ordering.ts
  schema/
    content.ts
    notes.ts
    qa.ts
    session.ts
    index.ts
```

## Tables

### `lecture_sessions`

- root session aggregate
- stores lecture metadata, pack version, tags, lifecycle status, and timestamps
- indexed by `starts_at`

### `lecture_materials`

- top-level lecture assets such as slide decks or handouts
- belongs to `lecture_sessions`
- indexed by `(session_id, order_index)`

### `material_chunks`

- searchable passages derived from lecture materials
- belongs to `lecture_sessions` and `lecture_materials`
- indexed by `material_id` and `session_id`

### `glossary_terms`

- highest-priority evidence source for grounded answers
- belongs to `lecture_sessions`
- unique on `(session_id, term)`

### `transcript_entries`

- optional transcript segments
- belongs to `lecture_sessions`
- indexed by `(session_id, order_index)`

### `summaries`

- session summaries, including generated fallback summaries
- belongs to `lecture_sessions`
- unique on `(session_id, kind)`

### `qa_categories`

- session-scoped categorization taxonomy
- belongs to `lecture_sessions`
- unique on `(session_id, key)`

### `questions`

- stores both seeded public prompts and local user questions
- belongs to `lecture_sessions`
- optionally references `qa_categories`
- indexed by session, visibility, and normalized text

### `answers`

- stores one persisted answer per question
- belongs to both `questions` and `lecture_sessions`
- unique on `question_id`

### `answer_sources`

- stores the local evidence trail for an answer
- belongs to both `answers` and `lecture_sessions`
- stores `source_type`, `source_record_id`, excerpt, label, and relevance score

### `notes`

- stores user-authored local notes
- belongs to `lecture_sessions`
- supports session, glossary-term, material-chunk, and transcript-entry anchors

### `bookmarks`

- stores user bookmarks for lecture content
- belongs to `lecture_sessions`
- unique on `(session_id, target_type, target_id)`

## Relationships

```text
lecture_sessions
  -> lecture_materials
    -> material_chunks
  -> glossary_terms
  -> transcript_entries
  -> summaries
  -> qa_categories
  -> questions
    -> answers
      -> answer_sources
  -> notes
  -> bookmarks
```

Foreign keys use cascade deletes where the child rows are wholly owned by the lecture session.

## Constrained Values

The schema uses constrained text checks for:

- session status
- material type
- summary kind
- question status
- question visibility
- question origin
- answer state
- answer source type
- note anchor type
- bookmark target type

## Migration Strategy

- Drizzle schema files are the source of truth.
- `npm run db:generate` runs `drizzle-kit generate` and then converts the generated SQL into the Expo migration payload used at runtime.
- `DrizzleDatabaseInitializer` applies `appMigrations` during app bootstrap.

This removes the old duplicated hand-written SQL migration file and keeps schema + runtime migration aligned.

## Grounded Answer Persistence

When a question is asked:

1. the application resolves retrieval and support before writing
2. `TransactionRunner` opens a local SQLite transaction
3. the question is inserted
4. the answer is inserted
5. evidence rows are inserted into `answer_sources`

If any write fails, the whole QA persistence operation rolls back.

## Source Priority

The relational model stores the evidence trail, while the application layer enforces the ranking:

1. `glossary_terms`
2. `material_chunks`
3. `transcript_entries`

Repository reads also use deterministic ordering so the UI and tests do not depend on incidental row order.

## Known Limitation

`answer_sources.source_record_id` is polymorphic, so SQLite cannot enforce a native foreign key to all possible source tables at once. Integrity is validated in the lecture-pack import flow and preserved by the grounded QA write path.
