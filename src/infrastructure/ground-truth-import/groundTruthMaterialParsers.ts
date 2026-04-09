import type { LecturePackDto } from '@application/dto/LecturePackDto';
import type { LectureMaterialType } from '@domain/value-objects/LectureEnums';
import { normalizeText, toExcerpt, uniqueStrings } from '@shared/utils/text';

import { parseCsv } from './csv';
import { extractStructuredGlossaryEntries, getGroundTruthAssetText } from './groundTruthGlossaryParser';
import {
  asSlug,
  buildId,
  chunkLongPlainText,
  parseJson,
  parseMarkdownSections,
  type ParsedMaterialChunk,
  type ParsedTranscriptEntry,
  splitParagraphs,
  toDisplayTitle,
} from './groundTruthParserUtils';
import type { NormalizedGroundTruthAsset } from './types';

const inferMaterialType = (asset: NormalizedGroundTruthAsset): LectureMaterialType => {
  if (asset.extension === 'pptx') {
    return 'slide_deck';
  }

  if (['png', 'jpg', 'jpeg', 'webp'].includes(asset.extension)) {
    return 'slide_deck';
  }

  if (/(slide|deck|presentation)/.test(asset.baseName)) {
    return 'slide_deck';
  }

  if (/(handout|worksheet)/.test(asset.baseName)) {
    return 'handout';
  }

  if (/(code|snippet|example)/.test(asset.baseName)) {
    return 'code_sample';
  }

  return 'reading';
};

const parseMaterialChunks = (asset: NormalizedGroundTruthAsset): ParsedMaterialChunk[] => {
  if (['png', 'jpg', 'jpeg', 'webp', 'mp4', 'mov', 'm4v', 'avi', 'webm'].includes(asset.extension)) {
    return [
      {
        heading: toDisplayTitle(asset.baseName),
        text:
          asset.extension === 'mp4' ||
          asset.extension === 'mov' ||
          asset.extension === 'm4v' ||
          asset.extension === 'avi' ||
          asset.extension === 'webm'
            ? `Video source uploaded: ${asset.name}. Multimodal indexing will extract searchable evidence from sampled frames and timestamps.`
            : `Image source uploaded: ${asset.name}. Multimodal indexing will extract searchable evidence from visible text and visual content.`,
        keywords: uniqueStrings(
          asset.baseName
            .split(/[_\-\s]+/)
            .map((value) => normalizeText(value))
            .filter(Boolean),
        ).slice(0, 6),
        orderIndex: 0,
      },
    ];
  }

  if (asset.extension === 'csv') {
    const rows = parseCsv(asset.textContent);
    return rows
      .map((row, rowIndex) => ({
        heading: row.heading || row.title || `Chunk ${rowIndex + 1}`,
        text: row.text || row.content || row.body || '',
        keywords: uniqueStrings(
          (row.keywords || '')
            .split(/[;,|]/)
            .map((keyword) => keyword.trim())
            .filter(Boolean),
        ),
        orderIndex: rowIndex,
      }))
      .filter((chunk: ParsedMaterialChunk) => chunk.text.trim().length > 0);
  }

  if (asset.extension === 'json') {
    const json = parseJson(asset);
    const chunkCandidates = Array.isArray(json)
      ? json
      : Array.isArray(json.chunks)
        ? json.chunks
        : Array.isArray(json.materials)
          ? json.materials.flatMap((material: { chunks?: unknown[] }) => material.chunks ?? [])
          : [];

    return chunkCandidates
      .map((chunk: unknown, index: number) => {
        const record = chunk as Record<string, unknown>;
        const text =
          typeof record.text === 'string'
            ? record.text.trim()
            : typeof record.content === 'string'
              ? record.content.trim()
              : '';

        return {
          heading:
            typeof record.heading === 'string'
              ? record.heading.trim()
              : typeof record.title === 'string'
                ? record.title.trim()
                : `Chunk ${index + 1}`,
          text,
          keywords: Array.isArray(record.keywords)
            ? record.keywords.filter((item): item is string => typeof item === 'string')
            : [],
          orderIndex: index,
        };
      })
      .filter((chunk: ParsedMaterialChunk) => chunk.text.length > 0);
  }

  const sourceText = getGroundTruthAssetText(asset);
  const glossaryEntrySections =
    asset.kind === 'glossary' || asset.extension === 'pdf'
      ? extractStructuredGlossaryEntries(sourceText).map((entry, index) => ({
          heading: entry.term,
          text: entry.definition,
          keywords: uniqueStrings(
            [entry.term, ...entry.term.split(/\s+/)]
              .map((word) => normalizeText(word))
              .filter(Boolean),
          ).slice(0, 6),
          orderIndex: index,
        }))
      : [];

  if (glossaryEntrySections.length) {
    return glossaryEntrySections;
  }

  const markdownSections =
    asset.extension === 'md' || asset.extension === 'markdown' || asset.extension === 'pptx'
      ? parseMarkdownSections(sourceText)
      : [];

  const paragraphSections = splitParagraphs(sourceText).map((text, index) => ({
    heading: `Passage ${index + 1}`,
    text,
  }));
  const sections = markdownSections.length
    ? markdownSections
    : paragraphSections.length > 1
      ? paragraphSections
      : chunkLongPlainText(sourceText);

  return sections.map((section, index) => ({
    heading: section.heading,
    text: section.text,
    keywords: uniqueStrings(section.heading.split(/\s+/).map((word) => word.toLowerCase())).slice(
      0,
      6,
    ),
    orderIndex: index,
  }));
};

export const parseMaterials = (assets: NormalizedGroundTruthAsset[]) =>
  assets
    .map((asset, materialIndex) => {
      const chunks = parseMaterialChunks(asset);
      if (!chunks.length) {
        return null;
      }

      const titleFromJson =
        asset.extension === 'json'
          ? (() => {
              const json = parseJson(asset);
              return typeof json.title === 'string' ? json.title.trim() : null;
            })()
          : null;

      const title = titleFromJson || asset.baseName.replace(/[_-]+/g, ' ').trim();

      return {
        id: buildId('material', title, materialIndex),
        title: title[0]
          ? title.replace(/\b\w/g, (letter: string) => letter.toUpperCase())
          : 'Imported material',
        type: inferMaterialType(asset),
        sourceLabel: asset.name,
        contentText: toExcerpt(
          chunks.map((chunk: ParsedMaterialChunk) => chunk.text).join(' '),
          220,
        ),
        orderIndex: materialIndex,
        chunks: chunks.map((chunk: ParsedMaterialChunk, chunkIndex: number) => ({
          id: buildId('chunk', `${title}_${chunk.heading}_${chunkIndex}`, chunkIndex),
          heading: chunk.heading,
          text: chunk.text,
          keywords: chunk.keywords,
          orderIndex: chunk.orderIndex,
        })),
      };
    })
    .filter((material): material is NonNullable<typeof material> => material !== null);

const buildFallbackMaterialsFromAssets = (
  assets: NormalizedGroundTruthAsset[],
  fallbackLabel: string,
) =>
  assets
    .map((asset, materialIndex) => {
      const chunks = parseMaterialChunks(asset);
      if (!chunks.length) {
        return null;
      }

      const title = toDisplayTitle(asset.baseName);

      return {
        id: buildId('material', `${fallbackLabel}_${asset.baseName}`, materialIndex),
        title: title || fallbackLabel,
        type: 'reading' as const,
        sourceLabel: asset.name,
        contentText: toExcerpt(
          chunks.map((chunk: ParsedMaterialChunk) => chunk.text).join(' '),
          220,
        ),
        orderIndex: materialIndex,
        chunks: chunks.map((chunk: ParsedMaterialChunk, chunkIndex: number) => ({
          id: buildId('chunk', `${asset.baseName}_${chunk.heading}_${chunkIndex}`, chunkIndex),
          heading: chunk.heading,
          text: chunk.text,
          keywords: chunk.keywords,
          orderIndex: chunk.orderIndex,
        })),
      };
    })
    .filter((material): material is NonNullable<typeof material> => material !== null);

export const ensureMaterialFallback = (
  materials: LecturePackDto['materials'],
  glossary: LecturePackDto['glossary'],
  transcript: LecturePackDto['transcript'],
  glossaryAssets: NormalizedGroundTruthAsset[],
  transcriptAssets: NormalizedGroundTruthAsset[],
) => {
  if (materials.length) {
    return materials;
  }

  const glossaryAssetFallback = buildFallbackMaterialsFromAssets(
    glossaryAssets,
    'Imported glossary',
  );
  if (glossaryAssetFallback.length) {
    return glossaryAssetFallback;
  }

  if (glossary.length) {
    return [
      {
        id: 'material_imported_glossary',
        title: 'Imported glossary',
        type: 'reading',
        sourceLabel: 'generated-from-glossary',
        contentText: 'A fallback material synthesized from uploaded glossary definitions.',
        orderIndex: 0,
        chunks: glossary.map((term, index) => ({
          id: buildId('chunk', `glossary_${term.term}_${index}`, index),
          heading: term.term,
          text: term.definition,
          keywords: uniqueStrings([term.term, ...term.aliases].map((value) => asSlug(value))).slice(0, 6),
          orderIndex: index,
        })),
      },
    ];
  }

  if (!transcript.length) {
    return buildFallbackMaterialsFromAssets(transcriptAssets, 'Imported transcript');
  }

  return [
    {
      id: 'material_imported_transcript',
      title: 'Imported lecture transcript',
      type: 'reading',
      sourceLabel: 'generated-from-transcript',
      contentText: 'A fallback material synthesized from uploaded transcript entries.',
      orderIndex: 0,
      chunks: transcript.map((entry: ParsedTranscriptEntry, index: number) => ({
        id: buildId('chunk', `transcript_${index}`, index),
        heading: `${entry.speakerLabel} ${index + 1}`,
        text: entry.text,
        keywords: uniqueStrings(entry.text.split(/\s+/).map((word) => asSlug(word))).slice(0, 6),
        orderIndex: index,
      })),
    },
  ];
};
