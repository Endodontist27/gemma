import type { LecturePackDto } from '@application/dto/LecturePackDto';
import type { SummaryKind } from '@domain/value-objects/LectureEnums';
import { nowIso } from '@shared/utils/dates';
import { normalizeText } from '@shared/utils/text';

import { parseCsv } from './csv';
import {
  asSlug,
  buildId,
  parseJson,
  parseLooseKeyValueText,
  parseMarkdownSections,
  type ParsedCategory,
  type ParsedSummary,
  type ParsedTranscriptEntry,
  type PartialSessionMetadata,
  splitParagraphs,
} from './groundTruthParserUtils';
import type { NormalizedGroundTruthAsset } from './types';

export const parseSessionMetadata = (asset: NormalizedGroundTruthAsset): PartialSessionMetadata => {
  const source =
    asset.extension === 'json' ? parseJson(asset) : parseLooseKeyValueText(asset.textContent);
  const rawTags = Array.isArray(source.tags)
    ? source.tags
    : typeof source.tags === 'string'
      ? source.tags.split(/[;,|]/)
      : [];

  return {
    title: typeof source.title === 'string' ? source.title.trim() : undefined,
    courseCode: typeof source.courseCode === 'string' ? source.courseCode.trim() : undefined,
    lecturer: typeof source.lecturer === 'string' ? source.lecturer.trim() : undefined,
    description: typeof source.description === 'string' ? source.description.trim() : undefined,
    location: typeof source.location === 'string' ? source.location.trim() : undefined,
    startsAt: typeof source.startsAt === 'string' ? source.startsAt.trim() : undefined,
    status:
      source.status === 'scheduled' || source.status === 'live' || source.status === 'ended'
        ? source.status
        : undefined,
    tags: rawTags.map((tag: string) => tag.trim()).filter(Boolean),
  };
};

const parseTimestampSeconds = (value: string) => {
  const match = value.match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  return hours * 3600 + minutes * 60 + seconds;
};

export const parseTranscript = (assets: NormalizedGroundTruthAsset[]) =>
  assets.flatMap((asset, assetIndex) => {
    if (asset.extension === 'json') {
      const json = parseJson(asset);
      const entries = Array.isArray(json)
        ? json
        : Array.isArray(json.transcript)
          ? json.transcript
          : [];

      return entries
        .map((entry: unknown, entryIndex: number) => {
          const record = entry as Record<string, unknown>;
          const text = typeof record.text === 'string' ? record.text.trim() : '';

          if (!text) {
            return null;
          }

          return {
            id: buildId('transcript', `${asset.baseName}_${entryIndex}`, assetIndex + entryIndex),
            speakerLabel:
              typeof record.speakerLabel === 'string' && record.speakerLabel.trim()
                ? record.speakerLabel.trim()
                : 'Lecture',
            text,
            startedAtSeconds:
              typeof record.startedAtSeconds === 'number' &&
              Number.isFinite(record.startedAtSeconds)
                ? Math.max(0, record.startedAtSeconds)
                : entryIndex * 30,
            orderIndex: entryIndex,
          };
        })
        .filter(
          (entry: ParsedTranscriptEntry | null): entry is ParsedTranscriptEntry => entry !== null,
        );
    }

    return splitParagraphs(asset.textContent).map((paragraph, entryIndex) => {
      const timestampMatch = paragraph.match(/^\[?((?:\d{1,2}:)?\d{1,2}:\d{2})\]?\s*(.*)$/);
      const withoutTimestamp = timestampMatch ? timestampMatch[2].trim() : paragraph;
      const timestamp = timestampMatch ? parseTimestampSeconds(timestampMatch[1]) : null;
      const speakerMatch = withoutTimestamp.match(/^([^:]{2,40}):\s+(.*)$/);

      return {
        id: buildId('transcript', `${asset.baseName}_${entryIndex}`, assetIndex + entryIndex),
        speakerLabel: speakerMatch ? speakerMatch[1].trim() : 'Lecture',
        text: speakerMatch ? speakerMatch[2].trim() : withoutTimestamp,
        startedAtSeconds: timestamp ?? entryIndex * 30,
        orderIndex: entryIndex,
      };
    });
  });

export const parseCategories = (assets: NormalizedGroundTruthAsset[]) =>
  assets.flatMap((asset, assetIndex) => {
    const rows =
      asset.extension === 'json'
        ? (() => {
            const json = parseJson(asset);
            return Array.isArray(json)
              ? json
              : Array.isArray(json.qaCategories)
                ? json.qaCategories
                : [];
          })()
        : asset.extension === 'csv'
          ? parseCsv(asset.textContent)
          : asset.textContent
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [label, description] = line.split(':');
                return {
                  label: label?.trim() ?? '',
                  description: description?.trim() ?? '',
                  key: asSlug(label ?? ''),
                };
              });

    return rows
      .map((row: unknown, index: number) => {
        const record = row as Record<string, unknown>;
        const label = typeof record.label === 'string' ? record.label.trim() : '';
        const description = typeof record.description === 'string' ? record.description.trim() : '';
        const key =
          typeof record.key === 'string' && record.key.trim() ? asSlug(record.key) : asSlug(label);

        if (!label || !description || !key) {
          return null;
        }

        return {
          id: buildId('category', key, assetIndex + index),
          key,
          label,
          description,
        };
      })
      .filter((entry: ParsedCategory | null): entry is ParsedCategory => entry !== null);
  });

export const parseSummaries = (assets: NormalizedGroundTruthAsset[]) =>
  assets.flatMap((asset, assetIndex) => {
    if (asset.extension === 'json') {
      const json = parseJson(asset);
      const summaries = Array.isArray(json)
        ? json
        : Array.isArray(json.summaries)
          ? json.summaries
          : [];

      return summaries
        .map((summary: unknown, index: number) => {
          const record = summary as Record<string, unknown>;
          const kind = typeof record.kind === 'string' ? (record.kind as SummaryKind) : 'overview';
          const title = typeof record.title === 'string' ? record.title.trim() : '';
          const text = typeof record.text === 'string' ? record.text.trim() : '';

          if (!title || !text) {
            return null;
          }

          return {
            id: buildId('summary', `${kind}_${title}`, assetIndex + index),
            kind:
              kind === 'overview' || kind === 'key_points' || kind === 'exam_focus'
                ? kind
                : 'overview',
            title,
            text,
          };
        })
        .filter((entry: ParsedSummary | null): entry is ParsedSummary => entry !== null);
    }

    return parseMarkdownSections(asset.textContent)
      .map((section, index) => {
        const lowerHeading = normalizeText(section.heading);
        const kind: SummaryKind = lowerHeading.includes('exam')
          ? 'exam_focus'
          : lowerHeading.includes('key')
            ? 'key_points'
            : 'overview';

        return {
          id: buildId('summary', `${kind}_${section.heading}`, assetIndex + index),
          kind,
          title: section.heading,
          text: section.text.replace(/\s+/g, ' ').trim(),
        };
      })
      .filter((entry) => entry.text.length > 0);
  });

export const parsePublicQa = (assets: NormalizedGroundTruthAsset[]) =>
  assets.flatMap((asset) => {
    if (asset.extension !== 'json') {
      return [];
    }

    const json = parseJson(asset);
    const items = Array.isArray(json) ? json : Array.isArray(json.publicQa) ? json.publicQa : [];

    return items
      .map((item: unknown) => {
        const record = item as Record<string, unknown>;
        const answerRecord =
          typeof record.answer === 'object' && record.answer !== null
            ? (record.answer as Record<string, unknown>)
            : null;
        const sources = Array.isArray(answerRecord?.sources)
          ? answerRecord.sources
              .map((source) => {
                const reference = source as Record<string, unknown>;
                return typeof reference.sourceType === 'string' &&
                  typeof reference.sourceId === 'string'
                  ? {
                      sourceType: reference.sourceType,
                      sourceId: reference.sourceId,
                    }
                  : null;
              })
              .filter((reference): reference is NonNullable<typeof reference> => reference !== null)
          : [];

        if (
          typeof record.questionText !== 'string' ||
          !record.questionText.trim() ||
          !answerRecord ||
          typeof answerRecord.text !== 'string' ||
          !answerRecord.text.trim() ||
          !sources.length
        ) {
          return null;
        }

        return {
          id:
            typeof record.id === 'string'
              ? record.id
              : buildId('public_question', record.questionText, sources.length),
          categoryKey:
            typeof record.categoryKey === 'string' && record.categoryKey.trim()
              ? asSlug(record.categoryKey)
              : 'general',
          questionText: record.questionText.trim(),
          askedAt:
            typeof record.askedAt === 'string' && record.askedAt.trim() ? record.askedAt : nowIso(),
          answer: {
            id:
              typeof answerRecord.id === 'string'
                ? answerRecord.id
                : buildId('public_answer', record.questionText, sources.length),
            text: answerRecord.text.trim(),
            confidenceScore:
              typeof answerRecord.confidenceScore === 'number'
                ? Math.max(0, Math.min(1, answerRecord.confidenceScore))
                : 0.7,
            sources,
          },
        };
      })
      .filter(
        (
          item: LecturePackDto['publicQa'][number] | null,
        ): item is LecturePackDto['publicQa'][number] => item !== null,
      );
  });
