import type { LecturePackDto } from '@application/dto/LecturePackDto';
import type { LectureSession } from '@domain/entities/LectureSession';
import { normalizeText } from '@shared/utils/text';

import type { LecturePackSessionGraph } from '@infrastructure/lecture-pack/import/types';
import { resolveAnswerSource } from '@infrastructure/lecture-pack/import/resolveAnswerSources';

export const buildSessionGraph = (
  parsed: LecturePackDto,
  sourceLabel: string,
  timestamp: string,
): LecturePackSessionGraph => {
  const session: LectureSession = {
    ...parsed.session,
    sourcePackVersion: `${parsed.packVersion}:${sourceLabel}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const materials = parsed.materials.map((material) => ({
    id: material.id,
    sessionId: session.id,
    title: material.title,
    type: material.type,
    sourceLabel: material.sourceLabel,
    contentText: material.contentText,
    orderIndex: material.orderIndex,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const chunks = parsed.materials.flatMap((material) =>
    material.chunks.map((chunk) => ({
      id: chunk.id,
      sessionId: session.id,
      materialId: material.id,
      heading: chunk.heading,
      text: chunk.text,
      keywords: chunk.keywords,
      orderIndex: chunk.orderIndex,
      createdAt: timestamp,
    })),
  );

  const glossary = parsed.glossary.map((term) => ({
    id: term.id,
    sessionId: session.id,
    term: term.term,
    aliases: term.aliases,
    definition: term.definition,
    orderIndex: term.orderIndex,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const transcript = parsed.transcript.map((entry) => ({
    id: entry.id,
    sessionId: session.id,
    speakerLabel: entry.speakerLabel,
    text: entry.text,
    startedAtSeconds: entry.startedAtSeconds,
    orderIndex: entry.orderIndex,
    createdAt: timestamp,
  }));

  const summaries = parsed.summaries.map((summary) => ({
    id: summary.id,
    sessionId: session.id,
    kind: summary.kind,
    title: summary.title,
    text: summary.text,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const categories = parsed.qaCategories.map((category) => ({
    id: category.id,
    sessionId: session.id,
    key: category.key,
    label: category.label,
    description: category.description,
    createdAt: timestamp,
  }));

  const categoryByKey = new Map(categories.map((category) => [category.key, category]));
  const glossaryById = new Map(glossary.map((term) => [term.id, term]));
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const transcriptById = new Map(transcript.map((entry) => [entry.id, entry]));

  const publicQuestions = parsed.publicQa.map((qa) => ({
    question: {
      id: qa.id,
      sessionId: session.id,
      categoryId: categoryByKey.get(qa.categoryKey)?.id ?? null,
      text: qa.questionText,
      normalizedText: normalizeText(qa.questionText),
      status: 'supported' as const,
      visibility: 'public' as const,
      origin: 'seed_public' as const,
      createdAt: qa.askedAt,
      updatedAt: qa.askedAt,
    },
    answer: {
      id: qa.answer.id,
      questionId: qa.id,
      sessionId: session.id,
      text: qa.answer.text,
      state: 'grounded' as const,
      confidenceScore: qa.answer.confidenceScore,
      createdAt: qa.askedAt,
    },
    sources: qa.answer.sources.map((sourceReference, index) =>
      resolveAnswerSource({
        sessionId: session.id,
        answerId: qa.answer.id,
        sourceType: sourceReference.sourceType,
        sourceId: sourceReference.sourceId,
        glossaryById,
        chunkById,
        transcriptById,
        createdAt: qa.askedAt,
        index,
      }),
    ),
  }));

  return {
    session,
    materials,
    chunks,
    glossary,
    transcript,
    summaries,
    categories,
    publicQuestions,
  };
};
