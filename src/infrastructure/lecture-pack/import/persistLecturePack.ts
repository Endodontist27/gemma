import { eq } from 'drizzle-orm';

import type { AppDatabase } from '@infrastructure/database/client';
import {
  toAnswerInsert,
  toAnswerSourceInsert,
  toGlossaryTermInsert,
  toLectureMaterialInsert,
  toLectureSessionInsert,
  toMaterialChunkInsert,
  toQACategoryInsert,
  toQuestionInsert,
  toSummaryInsert,
  toTranscriptEntryInsert,
} from '@infrastructure/database/mappers';
import {
  answerSources,
  answers,
  glossaryTerms,
  lectureMaterials,
  lectureSessions,
  materialChunks,
  qaCategories,
  questions,
  summaries,
  transcriptEntries,
} from '@infrastructure/database/schema';
import type { LecturePackSessionGraph } from '@infrastructure/lecture-pack/import/types';

export const persistLecturePack = (db: AppDatabase, graph: LecturePackSessionGraph): void => {
  db.transaction((tx) => {
    tx.delete(lectureSessions).where(eq(lectureSessions.id, graph.session.id)).run();
    tx.insert(lectureSessions).values(toLectureSessionInsert(graph.session)).run();

    if (graph.categories.length) {
      tx.insert(qaCategories).values(graph.categories.map(toQACategoryInsert)).run();
    }

    if (graph.materials.length) {
      tx.insert(lectureMaterials).values(graph.materials.map(toLectureMaterialInsert)).run();
    }

    if (graph.chunks.length) {
      tx.insert(materialChunks).values(graph.chunks.map(toMaterialChunkInsert)).run();
    }

    if (graph.glossary.length) {
      tx.insert(glossaryTerms).values(graph.glossary.map(toGlossaryTermInsert)).run();
    }

    if (graph.transcript.length) {
      tx.insert(transcriptEntries).values(graph.transcript.map(toTranscriptEntryInsert)).run();
    }

    if (graph.summaries.length) {
      tx.insert(summaries).values(graph.summaries.map(toSummaryInsert)).run();
    }

    if (!graph.publicQuestions.length) {
      return;
    }

    tx.insert(questions)
      .values(graph.publicQuestions.map(({ question }) => toQuestionInsert(question)))
      .run();
    tx.insert(answers)
      .values(graph.publicQuestions.map(({ answer }) => toAnswerInsert(answer)))
      .run();

    const flattenedSources = graph.publicQuestions.flatMap(({ sources }) => sources);
    if (flattenedSources.length) {
      tx.insert(answerSources).values(flattenedSources.map(toAnswerSourceInsert)).run();
    }
  });
};
