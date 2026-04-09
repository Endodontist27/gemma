import { desc, eq } from 'drizzle-orm';

import type { LectureSession } from '@domain/entities/LectureSession';
import type { GlossaryTerm } from '@domain/entities/GlossaryTerm';
import type { QACategory } from '@domain/entities/QACategory';
import type { Summary } from '@domain/entities/Summary';
import {
  toAnswerInsert,
  toAnswerSourceInsert,
  toGlossaryTermInsert,
  toLectureMaterialInsert,
  toQACategoryInsert,
  toQuestionInsert,
  toSummaryInsert,
  toTranscriptEntryInsert,
} from '@infrastructure/database/mappers';
import type { AppDatabase } from '@infrastructure/database/client';
import { deserializeStringArray, serializeStringArray } from '@infrastructure/database/serializers';
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
import { normalizeText, uniqueStrings } from '@shared/utils/text';

export interface GroundTruthSessionAppender {
  appendToSession(
    graph: LecturePackSessionGraph,
    existingSession: LectureSession,
  ): Promise<LectureSession>;
}

const nextOrderIndex = (values: { orderIndex: number }[]) =>
  (values[0]?.orderIndex ?? -1) + 1;

export class DrizzleGroundTruthSessionAppender implements GroundTruthSessionAppender {
  constructor(private readonly db: AppDatabase) {}

  async appendToSession(graph: LecturePackSessionGraph, existingSession: LectureSession) {
    return this.db.transaction((tx) => {
      const mergedSession: LectureSession = {
        ...existingSession,
        sourcePackVersion: graph.session.sourcePackVersion,
        tags: uniqueStrings([...existingSession.tags, ...graph.session.tags]),
        updatedAt: graph.session.updatedAt,
      };

      tx.update(lectureSessions)
        .set({
          sourcePackVersion: mergedSession.sourcePackVersion,
          tagsJson: serializeStringArray(mergedSession.tags),
          updatedAt: mergedSession.updatedAt,
        })
        .where(eq(lectureSessions.id, existingSession.id))
        .run();

      const materialOffset = nextOrderIndex(
        tx
          .select({ orderIndex: lectureMaterials.orderIndex })
          .from(lectureMaterials)
          .where(eq(lectureMaterials.sessionId, existingSession.id))
          .orderBy(desc(lectureMaterials.orderIndex))
          .limit(1)
          .all(),
      );

      const adjustedMaterials = graph.materials.map((material) => ({
        ...material,
        orderIndex: materialOffset + material.orderIndex,
      }));

      if (adjustedMaterials.length) {
        tx.insert(lectureMaterials)
          .values(adjustedMaterials.map(toLectureMaterialInsert))
          .run();
      }

      if (graph.chunks.length) {
        tx.insert(materialChunks)
          .values(graph.chunks.map((chunk) => ({
            id: chunk.id,
            sessionId: chunk.sessionId,
            materialId: chunk.materialId,
            heading: chunk.heading,
            text: chunk.text,
            keywordsJson: serializeStringArray(chunk.keywords),
            orderIndex: chunk.orderIndex,
            createdAt: chunk.createdAt,
          })))
          .run();
      }

      const glossaryOrderOffset = nextOrderIndex(
        tx
          .select({ orderIndex: glossaryTerms.orderIndex })
          .from(glossaryTerms)
          .where(eq(glossaryTerms.sessionId, existingSession.id))
          .orderBy(desc(glossaryTerms.orderIndex))
          .limit(1)
          .all(),
      );
      const existingGlossaryRows = tx
        .select()
        .from(glossaryTerms)
        .where(eq(glossaryTerms.sessionId, existingSession.id))
        .all();
      const existingGlossaryByTerm = new Map(
        existingGlossaryRows.map((term) => [normalizeText(term.term), term]),
      );
      const glossaryToInsert: GlossaryTerm[] = [];
      let glossaryInsertIndex = 0;

      for (const term of graph.glossary) {
        const normalizedTerm = normalizeText(term.term);
        const existingGlossary = existingGlossaryByTerm.get(normalizedTerm);

        if (!existingGlossary) {
          glossaryToInsert.push({
            ...term,
            orderIndex: glossaryOrderOffset + glossaryInsertIndex,
          });
          glossaryInsertIndex += 1;
          continue;
        }

        const existingAliases = deserializeStringArray(existingGlossary.aliasesJson);
        const mergedDefinition =
          term.definition.length > existingGlossary.definition.length
            ? term.definition
            : existingGlossary.definition;
        const mergedAliases = uniqueStrings([...existingAliases, ...term.aliases]);

        if (
          mergedDefinition !== existingGlossary.definition ||
          mergedAliases.some((alias, aliasIndex) => alias !== existingAliases[aliasIndex])
        ) {
          tx.update(glossaryTerms)
            .set({
              definition: mergedDefinition,
              aliasesJson: serializeStringArray(mergedAliases),
              updatedAt: term.updatedAt,
            })
            .where(eq(glossaryTerms.id, existingGlossary.id))
            .run();
        }
      }

      if (glossaryToInsert.length) {
        tx.insert(glossaryTerms)
          .values(glossaryToInsert.map(toGlossaryTermInsert))
          .run();
      }

      const transcriptOrderOffset = nextOrderIndex(
        tx
          .select({ orderIndex: transcriptEntries.orderIndex })
          .from(transcriptEntries)
          .where(eq(transcriptEntries.sessionId, existingSession.id))
          .orderBy(desc(transcriptEntries.orderIndex))
          .limit(1)
          .all(),
      );
      const adjustedTranscript = graph.transcript.map((entry) => ({
        ...entry,
        orderIndex: transcriptOrderOffset + entry.orderIndex,
      }));

      if (adjustedTranscript.length) {
        tx.insert(transcriptEntries)
          .values(adjustedTranscript.map(toTranscriptEntryInsert))
          .run();
      }

      const existingCategoryRows = tx
        .select()
        .from(qaCategories)
        .where(eq(qaCategories.sessionId, existingSession.id))
        .all();
      const categoryIdMap = new Map<string, string>();
      const categoriesToInsert: QACategory[] = [];

      for (const category of graph.categories) {
        const existingCategory = existingCategoryRows.find((row) => row.key === category.key);
        if (existingCategory) {
          categoryIdMap.set(category.id, existingCategory.id);
          continue;
        }

        categoriesToInsert.push(category);
        categoryIdMap.set(category.id, category.id);
      }

      if (categoriesToInsert.length) {
        tx.insert(qaCategories)
          .values(categoriesToInsert.map(toQACategoryInsert))
          .run();
      }

      const existingSummaryRows = tx
        .select()
        .from(summaries)
        .where(eq(summaries.sessionId, existingSession.id))
        .all();
      const summariesToInsert: Summary[] = [];

      for (const summary of graph.summaries) {
        const existingSummary = existingSummaryRows.find((row) => row.kind === summary.kind);
        if (!existingSummary) {
          summariesToInsert.push(summary);
          continue;
        }

        tx.update(summaries)
          .set({
            title: summary.title,
            text: summary.text,
            updatedAt: summary.updatedAt,
          })
          .where(eq(summaries.id, existingSummary.id))
          .run();
      }

      if (summariesToInsert.length) {
        tx.insert(summaries)
          .values(summariesToInsert.map(toSummaryInsert))
          .run();
      }

      const adjustedPublicQuestions = graph.publicQuestions.map(({ answer, question, sources }) => ({
        question: {
          ...question,
          categoryId: question.categoryId ? (categoryIdMap.get(question.categoryId) ?? null) : null,
        },
        answer,
        sources,
      }));

      if (adjustedPublicQuestions.length) {
        tx.insert(questions)
          .values(adjustedPublicQuestions.map(({ question }) => toQuestionInsert(question)))
          .run();
        tx.insert(answers)
          .values(adjustedPublicQuestions.map(({ answer }) => toAnswerInsert(answer)))
          .run();

        const flattenedSources = adjustedPublicQuestions.flatMap(({ sources }) => sources);
        if (flattenedSources.length) {
          tx.insert(answerSources)
            .values(flattenedSources.map(toAnswerSourceInsert))
            .run();
        }
      }

      return mergedSession;
    });
  }
}
