import type { LecturePackDto } from '@application/dto/LecturePackDto';
import { LecturePackDtoSchema } from '@application/dto/LecturePackDto';
import type { LectureSession } from '@domain/entities/LectureSession';
import { nowIso } from '@shared/utils/dates';
import { uniqueStrings } from '@shared/utils/text';

import { dedupeGlossaryTerms, parseGlossary } from './groundTruthGlossaryParser';
import { ensureMaterialFallback, parseMaterials } from './groundTruthMaterialParsers';
import { toDisplayTitle } from './groundTruthParserUtils';
import {
  parseCategories,
  parsePublicQa,
  parseSessionMetadata,
  parseSummaries,
  parseTranscript,
} from './groundTruthSupplementalParsers';
import type { NormalizedGroundTruthAsset } from './types';

const sessionScopedId = (scopeId: string, entityId: string) => `${scopeId}_${entityId}`;

const filterPublicQaWithKnownSources = (
  publicQa: LecturePackDto['publicQa'],
  knownSourceIds: Set<string>,
  knownCategoryKeys: Set<string>,
) =>
  publicQa.filter(
    (item) =>
      knownCategoryKeys.has(item.categoryKey) &&
      item.answer.sources.every((source) => knownSourceIds.has(source.sourceId)),
  );

const namespaceLecturePackIds = (
  lecturePack: LecturePackDto,
  namespaceSeed = lecturePack.session.id,
): LecturePackDto => {
  const materialIdMap = new Map(
    lecturePack.materials.map((material) => [material.id, sessionScopedId(namespaceSeed, material.id)]),
  );
  const chunkIdMap = new Map(
    lecturePack.materials.flatMap((material) =>
      material.chunks.map((chunk) => [chunk.id, sessionScopedId(namespaceSeed, chunk.id)]),
    ),
  );
  const glossaryIdMap = new Map(
    lecturePack.glossary.map((term) => [term.id, sessionScopedId(namespaceSeed, term.id)]),
  );
  const transcriptIdMap = new Map(
    lecturePack.transcript.map((entry) => [entry.id, sessionScopedId(namespaceSeed, entry.id)]),
  );
  const summaryIdMap = new Map(
    lecturePack.summaries.map((summary) => [summary.id, sessionScopedId(namespaceSeed, summary.id)]),
  );
  const categoryIdMap = new Map(
    lecturePack.qaCategories.map((category) => [
      category.id,
      sessionScopedId(namespaceSeed, category.id),
    ]),
  );
  const questionIdMap = new Map(
    lecturePack.publicQa.map((item) => [item.id, sessionScopedId(namespaceSeed, item.id)]),
  );
  const answerIdMap = new Map(
    lecturePack.publicQa.map((item) => [
      item.answer.id,
      sessionScopedId(namespaceSeed, item.answer.id),
    ]),
  );

  const resolveNamespacedSourceId = (
    sourceType: LecturePackDto['publicQa'][number]['answer']['sources'][number]['sourceType'],
    sourceId: string,
  ) => {
    if (sourceType === 'glossary_term') {
      return glossaryIdMap.get(sourceId) ?? sessionScopedId(namespaceSeed, sourceId);
    }

    if (sourceType === 'material_chunk') {
      return chunkIdMap.get(sourceId) ?? sessionScopedId(namespaceSeed, sourceId);
    }

    return transcriptIdMap.get(sourceId) ?? sessionScopedId(namespaceSeed, sourceId);
  };

  return {
    ...lecturePack,
    materials: lecturePack.materials.map<LecturePackDto['materials'][number]>((material) => ({
      ...material,
      id: materialIdMap.get(material.id) ?? sessionScopedId(namespaceSeed, material.id),
      type: material.type,
      chunks: material.chunks.map((chunk) => ({
        ...chunk,
        id: chunkIdMap.get(chunk.id) ?? sessionScopedId(namespaceSeed, chunk.id),
      })),
    })),
    glossary: lecturePack.glossary.map((term) => ({
      ...term,
      id: glossaryIdMap.get(term.id) ?? sessionScopedId(namespaceSeed, term.id),
    })),
    transcript: lecturePack.transcript.map((entry) => ({
      ...entry,
      id: transcriptIdMap.get(entry.id) ?? sessionScopedId(namespaceSeed, entry.id),
    })),
    summaries: lecturePack.summaries.map((summary) => ({
      ...summary,
      id: summaryIdMap.get(summary.id) ?? sessionScopedId(namespaceSeed, summary.id),
    })),
    qaCategories: lecturePack.qaCategories.map((category) => ({
      ...category,
      id: categoryIdMap.get(category.id) ?? sessionScopedId(namespaceSeed, category.id),
    })),
    publicQa: lecturePack.publicQa.map((item) => ({
      ...item,
      id: questionIdMap.get(item.id) ?? sessionScopedId(namespaceSeed, item.id),
      answer: {
        ...item.answer,
        id: answerIdMap.get(item.answer.id) ?? sessionScopedId(namespaceSeed, item.answer.id),
        sources: item.answer.sources.map((source) => ({
          ...source,
          sourceId: resolveNamespacedSourceId(source.sourceType, source.sourceId),
        })),
      },
    })),
  };
};

interface BuildGroundTruthLecturePackOptions {
  existingSession?: LectureSession;
  idNamespaceSeed?: string;
}

export const buildGroundTruthLecturePack = (
  assets: NormalizedGroundTruthAsset[],
  sourceLabel: string,
  options?: BuildGroundTruthLecturePackOptions,
) => {
  if (!assets.length) {
    throw new Error('Select at least one grounded-data file to import.');
  }

  const sessionAsset = assets.find((asset) => asset.kind === 'session');
  const sessionMetadata = sessionAsset ? parseSessionMetadata(sessionAsset) : {};

  const materialAssets = assets.filter((asset) => asset.kind === 'material');
  const glossaryAssets = assets.filter((asset) => asset.kind === 'glossary');
  const transcriptAssets = assets.filter((asset) => asset.kind === 'transcript');
  const summaryAssets = assets.filter((asset) => asset.kind === 'summaries');
  const categoryAssets = assets.filter((asset) => asset.kind === 'categories');
  const publicQaAssets = assets.filter((asset) => asset.kind === 'public_qa');

  const transcript = parseTranscript(transcriptAssets);
  const glossary = dedupeGlossaryTerms(parseGlossary(glossaryAssets));
  const parsedMaterials = parseMaterials(materialAssets);
  const materials = ensureMaterialFallback(
    parsedMaterials,
    glossary,
    transcript,
    glossaryAssets,
    transcriptAssets,
  );
  const summaries = parseSummaries(summaryAssets);
  const parsedCategories = parseCategories(categoryAssets);
  const categories =
    parsedCategories.length > 0
      ? parsedCategories
      : [
          {
            id: 'category_concepts',
            key: 'concepts',
            label: 'Concepts',
            description: 'Definitions and grounded lecture concepts.',
          },
        ];

  const knownSourceIds = new Set([
    ...materials.map((material) => material.id),
    ...materials.flatMap((material) => material.chunks.map((chunk) => chunk.id)),
    ...glossary.map((term) => term.id),
    ...transcript.map((entry) => entry.id),
  ]);
  const publicQa = filterPublicQaWithKnownSources(
    parsePublicQa(publicQaAssets),
    knownSourceIds,
    new Set(categories.map((category) => category.key)),
  );

  const title =
    options?.existingSession?.title ??
    sessionMetadata.title ??
    parsedMaterials[0]?.title ??
    (assets[0]?.baseName ? toDisplayTitle(assets[0].baseName) : undefined) ??
    (transcriptAssets[0]?.baseName ? toDisplayTitle(transcriptAssets[0].baseName) : undefined) ??
    'Imported lecture session';
  const startsAt = options?.existingSession?.startsAt ?? sessionMetadata.startsAt ?? nowIso();
  const description =
    options?.existingSession?.description ??
    sessionMetadata.description ??
    `Ground-truth lecture import assembled from ${assets.length} uploaded file${assets.length === 1 ? '' : 's'}.`;
  const sessionId = options?.existingSession?.id ?? `session_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'imported_lecture_session'}`;

  const rawLecturePack = LecturePackDtoSchema.parse({
    packVersion: '1.0.0',
    exportedAt: nowIso(),
    session: {
      id: sessionId,
      title,
      courseCode: options?.existingSession?.courseCode ?? sessionMetadata.courseCode ?? 'LOCAL-IMPORT',
      lecturer:
        options?.existingSession?.lecturer ?? sessionMetadata.lecturer ?? 'Imported lecture data',
      description,
      location: options?.existingSession?.location ?? sessionMetadata.location ?? sourceLabel,
      startsAt,
      status: options?.existingSession?.status ?? sessionMetadata.status ?? 'live',
      tags: uniqueStrings([
        ...(options?.existingSession?.tags ?? []),
        'uploaded',
        'ground-truth',
        ...(sessionMetadata.tags ?? []),
        ...assets.map((asset) => asset.kind.replace('_', '-')),
      ]),
    },
    materials,
    glossary,
    transcript,
    summaries,
    qaCategories: categories,
    publicQa,
  });
  const lecturePack = LecturePackDtoSchema.parse(
    namespaceLecturePackIds(rawLecturePack, options?.idNamespaceSeed ?? sessionId),
  );

  return lecturePack;
};
