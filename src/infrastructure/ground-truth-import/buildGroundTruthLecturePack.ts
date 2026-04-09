import type { LecturePackDto } from '@application/dto/LecturePackDto';
import { LecturePackDtoSchema } from '@application/dto/LecturePackDto';
import type { LectureSession } from '@domain/entities/LectureSession';
import type { LectureMaterialType, SummaryKind } from '@domain/value-objects/LectureEnums';
import { nowIso } from '@shared/utils/dates';
import { normalizeText, toExcerpt, uniqueStrings } from '@shared/utils/text';

import { parseCsv } from './csv';
import type { NormalizedGroundTruthAsset, PartialSessionMetadata } from './types';

interface ParsedMaterialChunk {
  heading: string;
  text: string;
  keywords: string[];
  orderIndex: number;
}

interface ParsedGlossaryTerm {
  id: string;
  term: string;
  aliases: string[];
  definition: string;
  orderIndex: number;
}

interface ParsedTranscriptEntry {
  id: string;
  speakerLabel: string;
  text: string;
  startedAtSeconds: number;
  orderIndex: number;
}

interface ParsedCategory {
  id: string;
  key: string;
  label: string;
  description: string;
}

interface ParsedSummary {
  id: string;
  kind: SummaryKind;
  title: string;
  text: string;
}

const sessionScopedId = (scopeId: string, entityId: string) => `${scopeId}_${entityId}`;

const GLOSSARY_METADATA_TERMS = new Set([
  'alphabetical glossary starts on the next page',
  'how to use this pdf',
  'included scope',
  'included topic bands',
  'indirect restoration language',
  'occlusal and esthetic vocabulary',
  'operative concepts',
  'restorative materials',
  'scope',
  'total unique terms',
  'unique terms and concise definitions',
  'use note',
  'endodontic terms and definitions',
]);

const GLOSSARY_PDF_COLUMN_START_MIN = 55;
const GLOSSARY_PDF_COLUMN_START_MAX = 90;

const isGlossaryTermCandidate = (value: string) => {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact || compact.length > 96) {
    return false;
  }

  const words = compact.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 10) {
    return false;
  }

  if (!/[a-z]/i.test(compact)) {
    return false;
  }

  if (/^(?:the|an?)\s+/iu.test(compact)) {
    return false;
  }

  if (/[.!?]$/.test(compact)) {
    return false;
  }

  return !/[.!?].+\s/.test(compact);
};

const isGlossaryDefinitionCandidate = (value: string) => {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return false;
  }

  return compact.length >= 24 || compact.split(/\s+/).length >= 4;
};

const asSlug = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'item';

const buildId = (prefix: string, value: string, fallbackIndex: number) =>
  `${prefix}_${asSlug(value)}${fallbackIndex > 0 ? `_${fallbackIndex}` : ''}`;

const toDisplayTitle = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());

const splitParagraphs = (raw: string) =>
  raw
    .split(/\n\s*\n+/)
    .map((section) => section.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

const normalizeGlossaryMetadataKey = (value: string) =>
  normalizeText(
    sanitizeGlossaryTerm(value)
      .replace(/^[-*]\s+/u, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );

const isIgnoredGlossaryEntry = (term: string, definition: string) => {
  const normalizedTerm = normalizeGlossaryMetadataKey(term);
  const normalizedDefinition = definition.replace(/\s+/g, ' ').trim();

  if (!normalizedTerm || !normalizedDefinition) {
    return true;
  }

  if (GLOSSARY_METADATA_TERMS.has(normalizedTerm)) {
    return true;
  }

  if (normalizedTerm.includes('glossary') || normalizedTerm.startsWith('included ')) {
    return true;
  }

  if (/^\d+$/u.test(normalizedDefinition)) {
    return true;
  }

  return false;
};

const median = (values: number[]) => {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[midpoint] ?? null;
  }

  const lower = sorted[midpoint - 1];
  const upper = sorted[midpoint];

  if (lower === undefined || upper === undefined) {
    return sorted[midpoint] ?? null;
  }

  return Math.round((lower + upper) / 2);
};

const isGlossaryPdfHeaderLine = (value: string) =>
  /endodontic glossary/i.test(value) && /concise definitions/i.test(value);

const sanitizeGlossaryTerm = (value: string) =>
  value
    .replace(/^[-*]\s+/u, '')
    .replace(/\s+/g, ' ')
    .replace(/^[A-Z]\s+(?=[A-Z][a-z])/u, '')
    .trim();

const isAlphabeticalDividerLine = (value: string) => /^[A-Z]$/u.test(value.trim());

const parseGlossaryEntryStart = (value: string) => {
  const compact = value.replace(/\s+/g, ' ').trim();
  const match = compact.match(/^([A-Z][A-Za-z0-9'()/\- ]{1,96})\.\s+(.+)$/u);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const term = sanitizeGlossaryTerm(match[1]);
  const definition = match[2].replace(/\s+/g, ' ').trim();
  const normalizedTerm = normalizeText(term);

  if (
    !term ||
    !definition ||
    !isGlossaryTermCandidate(term) ||
    GLOSSARY_METADATA_TERMS.has(normalizedTerm) ||
    !isGlossaryDefinitionCandidate(definition) ||
    isIgnoredGlossaryEntry(term, definition)
  ) {
    return null;
  }

  return {
    term,
    definition,
  };
};

const extractGlossaryEntrySections = (raw: string) => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const entries: { term: string; definition: string }[] = [];
  let current: { term: string; definition: string } | null = null;
  let glossaryStarted = false;

  const flushCurrent = () => {
    if (!current) {
      return;
    }

    const definition = current.definition.replace(/\s+/g, ' ').trim();
    if (current.term && definition) {
      entries.push({
        term: current.term,
        definition,
      });
    }

    current = null;
  };

  for (const line of lines) {
    if (
      !line ||
      /^\d+$/u.test(line) ||
      isGlossaryPdfHeaderLine(line) ||
      /^restorative dentistry glossary$/iu.test(line) ||
      /^unique terms and concise definitions/iu.test(line) ||
      /^how to use this pdf$/iu.test(line) ||
      /^included topic bands$/iu.test(line)
    ) {
      continue;
    }

    if (/^alphabetical glossary starts on the next page\.?$/iu.test(line)) {
      glossaryStarted = true;
      continue;
    }

    if (/^(total unique terms|scope):/iu.test(line)) {
      continue;
    }

    if (isAlphabeticalDividerLine(line)) {
      glossaryStarted = true;
      continue;
    }

    const entryStart = parseGlossaryEntryStart(line);
    if (entryStart) {
      glossaryStarted = true;
      flushCurrent();
      current = entryStart;
      continue;
    }

    if (!glossaryStarted || !current) {
      continue;
    }

    current.definition = `${current.definition} ${line}`.replace(/\s+/g, ' ').trim();
  }

  flushCurrent();

  return entries;
};

const splitOversizedSegment = (segment: string, maxLength = 420) => {
  const normalizedSegment = segment.replace(/\s+/g, ' ').trim();
  if (!normalizedSegment) {
    return [];
  }

  if (normalizedSegment.length <= maxLength) {
    return [normalizedSegment];
  }

  const sentenceCandidates = normalizedSegment
    .split(/(?<=[.!?])\s+/)
    .map((candidate) => candidate.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const atomicSegments =
    sentenceCandidates.length > 1
      ? sentenceCandidates
      : normalizedSegment.split(/\s+/).reduce<string[]>((chunks, word) => {
          const current = chunks[chunks.length - 1] ?? '';
          const next = current ? `${current} ${word}` : word;

          if (!current || next.length <= maxLength) {
            if (chunks.length === 0) {
              chunks.push(next);
            } else {
              chunks[chunks.length - 1] = next;
            }
            return chunks;
          }

          chunks.push(word);
          return chunks;
        }, []);

  const chunks: string[] = [];
  let current = '';

  for (const atomicSegment of atomicSegments) {
    const next = current ? `${current} ${atomicSegment}` : atomicSegment;
    if (current && next.length > maxLength) {
      chunks.push(current);
      current = atomicSegment;
      continue;
    }

    current = next;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
};

const chunkLongPlainText = (raw: string) => {
  const sourceLines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const baseSegments =
    sourceLines.length >= 6
      ? sourceLines
      : raw
          .split(/(?<=[.!?])\s+/)
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
  const segments = baseSegments.flatMap((segment) => splitOversizedSegment(segment));

  const chunks: { heading: string; text: string }[] = [];
  let currentLines: string[] = [];
  let currentLength = 0;

  const flush = () => {
    const text = currentLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!text) {
      return;
    }

    chunks.push({
      heading: `Passage ${chunks.length + 1}`,
      text,
    });
    currentLines = [];
    currentLength = 0;
  };

  for (const segment of segments) {
    const normalizedSegment = segment.replace(/\s+/g, ' ').trim();
    if (!normalizedSegment) {
      continue;
    }

    if (currentLines.length && currentLength + normalizedSegment.length + 1 > 900) {
      flush();
    }

    currentLines.push(normalizedSegment);
    currentLength += normalizedSegment.length + 1;
  }

  flush();
  return chunks;
};

const detectGlossaryPdfColumnStart = (lines: string[]) => {
  const columnStarts: number[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const rightOnlyMatch = line.match(/^(\s{20,})(\S.*)$/);
    if (rightOnlyMatch) {
      const start = rightOnlyMatch[1]?.length ?? 0;
      if (start >= GLOSSARY_PDF_COLUMN_START_MIN && start <= GLOSSARY_PDF_COLUMN_START_MAX) {
        columnStarts.push(start);
      }
      continue;
    }

    for (const match of line.matchAll(/\s{3,}(?=\S)/g)) {
      const start = (match.index ?? 0) + match[0].length;
      if (start >= GLOSSARY_PDF_COLUMN_START_MIN && start <= GLOSSARY_PDF_COLUMN_START_MAX) {
        columnStarts.push(start);
        break;
      }
    }
  }

  if (columnStarts.length < 2) {
    return null;
  }

  return median(columnStarts);
};

const normalizeGlossaryPdfTextLayout = (raw: string) => {
  const pages = raw.split(/\f+/);

  return pages
    .map((page) => {
      const lines = page.split(/\r?\n/);
      const columnStart = detectGlossaryPdfColumnStart(lines);
      const leftColumn: string[] = [];
      const rightColumn: string[] = [];

      for (const line of lines) {
        const stripped = line.trim();
        if (!stripped || stripped === '•' || stripped === '-') {
          continue;
        }

        if (/^\d+$/.test(stripped) || isGlossaryPdfHeaderLine(stripped)) {
          continue;
        }

        if (columnStart !== null && line.length >= columnStart) {
          const left = line.slice(0, columnStart).trim();
          const right = line.slice(columnStart).trim();

          if (left) {
            leftColumn.push(left);
          }

          if (right) {
            rightColumn.push(right);
          }

          continue;
        }

        if (/^\s{20,}\S/.test(line)) {
          rightColumn.push(stripped);
          continue;
        }

        leftColumn.push(stripped);
      }

      return [...leftColumn, '', ...rightColumn].join('\n').trim();
    })
    .filter(Boolean)
    .join('\n\n');
};

const getGroundTruthAssetText = (asset: NormalizedGroundTruthAsset) =>
  asset.kind === 'glossary' &&
  asset.extension === 'pdf' &&
  (asset.textContent.includes('\f') || asset.textContent.split(/\r?\n/).length >= 4)
    ? normalizeGlossaryPdfTextLayout(asset.textContent)
    : asset.textContent;

const extractInlineGlossaryEntries = (raw: string) => {
  const flattened = raw
    .replace(/\f/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\d+$/u.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const glossaryStartMatch = flattened.match(
    /(?:^|\s)(?:[A-Z]\s+)?[A-Z][A-Za-z0-9'()/\-]*(?: (?:(?:[a-z][A-Za-z0-9'()/\-]*)|(?:[A-Z]{2,}[A-Za-z0-9'()/\-]*))){0,5}\.\s+[A-Z]/u,
  );
  const searchText =
    typeof glossaryStartMatch?.index === 'number'
      ? flattened.slice(glossaryStartMatch.index).trim()
      : flattened;

  const entryPattern =
    /(?:^|\s)([A-Z][A-Za-z0-9'()/\- ]{1,80})\.\s+(.+?)(?=(?:\s+[A-Z][A-Za-z0-9'()/\- ]{1,80}\.\s+)|$)/gu;

  return Array.from(searchText.matchAll(entryPattern))
    .map((match) => {
      const term = sanitizeGlossaryTerm(match[1]?.trim() ?? '');
      const definition = match[2]?.replace(/\s+/g, ' ').trim() ?? '';

      if (
        !term ||
        !definition ||
        !isGlossaryTermCandidate(term) ||
        !isGlossaryDefinitionCandidate(definition) ||
        isIgnoredGlossaryEntry(term, definition)
      ) {
        return null;
      }

      return {
        term,
        definition,
      };
    })
    .filter((entry): entry is { term: string; definition: string } => entry !== null);
};

const extractSequentialGlossaryEntries = (values: string[], sourceLabel: 'paragraph' | 'line') => {
  const entries: { term: string; definition: string }[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    const next = values[index + 1];

    if (
      current &&
      next &&
      isGlossaryTermCandidate(current) &&
      isGlossaryDefinitionCandidate(next) &&
      !isIgnoredGlossaryEntry(current, next)
    ) {
      entries.push({
        term: sanitizeGlossaryTerm(current),
        definition: next,
      });
      index += 1;
      continue;
    }

    if (
      sourceLabel === 'line' &&
      current &&
      current.includes('.') &&
      parseGlossaryEntryStart(current)
    ) {
      const entry = parseGlossaryEntryStart(current);
      if (entry) {
        entries.push(entry);
      }
    }
  }

  return entries;
};

const dedupeExtractedGlossaryEntries = (entries: { term: string; definition: string }[]) => {
  const byTerm = new Map<string, { term: string; definition: string }>();

  for (const entry of entries) {
    const normalizedTerm = normalizeGlossaryMetadataKey(entry.term);
    if (!normalizedTerm || isIgnoredGlossaryEntry(entry.term, entry.definition)) {
      continue;
    }

    const existing = byTerm.get(normalizedTerm);
    if (!existing || entry.definition.length > existing.definition.length) {
      byTerm.set(normalizedTerm, {
        term: sanitizeGlossaryTerm(entry.term),
        definition: entry.definition.replace(/\s+/g, ' ').trim(),
      });
    }
  }

  return Array.from(byTerm.values());
};

const averageDefinitionLength = (entries: { term: string; definition: string }[]) =>
  entries.length === 0
    ? 0
    : entries.reduce((sum, entry) => sum + entry.definition.length, 0) / entries.length;

const extractStructuredGlossaryEntries = (raw: string) => {
  const sourceText = raw.replace(/\u0000/g, '');
  const paragraphValues = splitParagraphs(sourceText).map((paragraph) =>
    paragraph.replace(/\s+/g, ' ').trim(),
  );
  const lineValues = sourceText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const strategies = [
    extractInlineGlossaryEntries(sourceText),
    extractGlossaryEntrySections(sourceText),
    extractSequentialGlossaryEntries(paragraphValues, 'paragraph'),
    extractSequentialGlossaryEntries(lineValues, 'line'),
  ].map((candidateEntries) => dedupeExtractedGlossaryEntries(candidateEntries));

  for (const dedupedEntries of strategies) {
    if (dedupedEntries.length >= 3) {
      return dedupedEntries;
    }
  }

  return strategies.reduce<{ term: string; definition: string }[]>((best, candidate) => {
    if (candidate.length > best.length) {
      return candidate;
    }

    if (
      candidate.length === best.length &&
      averageDefinitionLength(candidate) > averageDefinitionLength(best)
    ) {
      return candidate;
    }

    return best;
  }, []);
};

const parseMarkdownSections = (raw: string) => {
  const sections: { heading: string; text: string }[] = [];
  const lines = raw.split(/\r?\n/);
  let currentHeading = 'Section';
  let currentLines: string[] = [];

  const flush = () => {
    const text = currentLines.join('\n').trim();
    if (!text) {
      return;
    }

    sections.push({
      heading: currentHeading,
      text,
    });
  };

  for (const line of lines) {
    const headingMatch = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim() || 'Section';
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  flush();
  return sections;
};

const parseLooseKeyValueText = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((record, line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex < 0) {
        return record;
      }

      const key = normalizeText(line.slice(0, separatorIndex));
      const value = line.slice(separatorIndex + 1).trim();

      if (key && value) {
        record[key] = value;
      }

      return record;
    }, {});

const parseJson = (asset: NormalizedGroundTruthAsset) => {
  try {
    return JSON.parse(asset.textContent);
  } catch {
    throw new Error(`Could not parse ${asset.name} as JSON.`);
  }
};

const parseSessionMetadata = (asset: NormalizedGroundTruthAsset): PartialSessionMetadata => {
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

const parseMaterials = (assets: NormalizedGroundTruthAsset[]) =>
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

const parseGlossary = (assets: NormalizedGroundTruthAsset[]) =>
  assets.flatMap((asset, assetIndex) => {
    const sourceText = getGroundTruthAssetText(asset);

    if (asset.extension === 'json') {
      const json = parseJson(asset);
      const entries = Array.isArray(json)
        ? json
        : Array.isArray(json.glossary)
          ? json.glossary
          : [];

      return entries
        .map((entry: unknown, entryIndex: number) => {
          const record = entry as Record<string, unknown>;
          const term = typeof record.term === 'string' ? record.term.trim() : '';
          const definition = typeof record.definition === 'string' ? record.definition.trim() : '';

          if (!term || !definition) {
            return null;
          }

          return {
            id: buildId('glossary', term, assetIndex + entryIndex),
            term,
            aliases: Array.isArray(record.aliases)
              ? record.aliases.filter((item): item is string => typeof item === 'string')
              : [],
            definition,
            orderIndex: entryIndex,
          };
        })
        .filter((entry: ParsedGlossaryTerm | null): entry is ParsedGlossaryTerm => entry !== null);
    }

    if (asset.extension === 'csv') {
      return parseCsv(asset.textContent)
        .map((row, entryIndex) => {
          const term = row.term || row.label;
          const definition = row.definition || row.description;

          if (!term || !definition) {
            return null;
          }

          return {
            id: buildId('glossary', term, assetIndex + entryIndex),
            term,
            aliases: (row.aliases || '')
              .split(/[;,|]/)
              .map((alias) => alias.trim())
              .filter(Boolean),
            definition,
            orderIndex: entryIndex,
          };
        })
        .filter((entry: ParsedGlossaryTerm | null): entry is ParsedGlossaryTerm => entry !== null);
    }

    const colonEntries = sourceText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, entryIndex) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex < 0) {
          return null;
        }

        const term = sanitizeGlossaryTerm(line.slice(0, separatorIndex).trim());
        const definition = line.slice(separatorIndex + 1).trim();

        if (!term || !definition || isIgnoredGlossaryEntry(term, definition)) {
          return null;
        }

        return {
          id: buildId('glossary', term, assetIndex + entryIndex),
          term,
          aliases: [],
          definition,
          orderIndex: entryIndex,
        };
      })
      .filter((entry: ParsedGlossaryTerm | null): entry is ParsedGlossaryTerm => entry !== null);

    const extractedGlossaryEntries = extractStructuredGlossaryEntries(sourceText).map(
      (entry, entryIndex) => ({
        id: buildId('glossary', entry.term, assetIndex + entryIndex),
        term: entry.term,
        aliases: [],
        definition: entry.definition,
        orderIndex: entryIndex,
      }),
    );

    if (extractedGlossaryEntries.length >= 2) {
      return extractedGlossaryEntries;
    }

    if (colonEntries.length) {
      return colonEntries;
    }

    if (extractedGlossaryEntries.length) {
      return extractedGlossaryEntries;
    }

    const paragraphEntries: ParsedGlossaryTerm[] = [];
    const paragraphs = splitParagraphs(sourceText).map((paragraph) =>
      paragraph.replace(/\s+/g, ' ').trim(),
    );

    for (let index = 0; index < paragraphs.length; index += 1) {
      const current = paragraphs[index];
      const next = paragraphs[index + 1];

      if (
        current &&
        next &&
        isGlossaryTermCandidate(current) &&
        isGlossaryDefinitionCandidate(next) &&
        !isIgnoredGlossaryEntry(current, next)
      ) {
        paragraphEntries.push({
          id: buildId('glossary', current, assetIndex + paragraphEntries.length),
          term: sanitizeGlossaryTerm(current),
          aliases: [],
          definition: next,
          orderIndex: paragraphEntries.length,
        });
        index += 1;
      }
    }

    if (paragraphEntries.length) {
      return paragraphEntries;
    }

    const lineEntries: ParsedGlossaryTerm[] = [];
    const lines = sourceText
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    for (let index = 0; index < lines.length; index += 1) {
      const current = lines[index];
      const next = lines[index + 1];

      if (
        current &&
        next &&
        isGlossaryTermCandidate(current) &&
        isGlossaryDefinitionCandidate(next) &&
        !isIgnoredGlossaryEntry(current, next)
      ) {
        lineEntries.push({
          id: buildId('glossary', current, assetIndex + lineEntries.length),
          term: sanitizeGlossaryTerm(current),
          aliases: [],
          definition: next,
          orderIndex: lineEntries.length,
        });
        index += 1;
      }
    }

    return lineEntries;
  });

const dedupeGlossaryTerms = (entries: ParsedGlossaryTerm[]): ParsedGlossaryTerm[] => {
  const byNormalizedTerm = new Map<string, ParsedGlossaryTerm>();

  for (const entry of entries) {
    const normalizedTerm = normalizeText(entry.term);
    const wordCount = normalizedTerm.split(/\s+/).filter(Boolean).length;

    if (
      !normalizedTerm ||
      GLOSSARY_METADATA_TERMS.has(normalizedTerm) ||
      normalizedTerm.includes('glossary') ||
      wordCount > 7 ||
      /^[a-z]$/i.test(normalizedTerm) ||
      /[.!?]/.test(entry.term)
    ) {
      continue;
    }

    const existing = byNormalizedTerm.get(normalizedTerm);

    if (!existing) {
      byNormalizedTerm.set(normalizedTerm, {
        ...entry,
        aliases: uniqueStrings(entry.aliases.filter(Boolean)),
      });
      continue;
    }

    const preferredDefinition =
      entry.definition.length > existing.definition.length ? entry.definition : existing.definition;

    byNormalizedTerm.set(normalizedTerm, {
      ...existing,
      definition: preferredDefinition,
      aliases: uniqueStrings(
        [
          ...existing.aliases,
          ...entry.aliases,
          existing.term !== entry.term ? entry.term : '',
        ].filter(Boolean),
      ),
    });
  }

  return Array.from(byNormalizedTerm.values()).map((entry, index) => ({
    ...entry,
    orderIndex: index,
  }));
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

const parseTranscript = (assets: NormalizedGroundTruthAsset[]) =>
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

const parseCategories = (assets: NormalizedGroundTruthAsset[]) =>
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

const parseSummaries = (assets: NormalizedGroundTruthAsset[]) =>
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

const parsePublicQa = (assets: NormalizedGroundTruthAsset[]) =>
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

const ensureMaterialFallback = (
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
          keywords: uniqueStrings([term.term, ...term.aliases].map((value) => asSlug(value))).slice(
            0,
            6,
          ),
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
      chunks: transcript.map((entry, index) => ({
        id: buildId('chunk', `transcript_${index}`, index),
        heading: `${entry.speakerLabel} ${index + 1}`,
        text: entry.text,
        keywords: uniqueStrings(entry.text.split(/\s+/).map((word) => asSlug(word))).slice(0, 6),
        orderIndex: index,
      })),
    },
  ];
};

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
  const sessionId = options?.existingSession?.id ?? buildId('session', title, 0);

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
