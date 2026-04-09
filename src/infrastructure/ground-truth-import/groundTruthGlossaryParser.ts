import { normalizeText, uniqueStrings } from '@shared/utils/text';

import { parseCsv } from './csv';
import {
  buildId,
  parseJson,
  type ParsedGlossaryTerm,
  splitParagraphs,
} from './groundTruthParserUtils';
import type { NormalizedGroundTruthAsset } from './types';

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
        if (!stripped || stripped === 'â€¢' || stripped === '-') {
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

export const getGroundTruthAssetText = (asset: NormalizedGroundTruthAsset) =>
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

    if (sourceLabel === 'line' && current && current.includes('.') && parseGlossaryEntryStart(current)) {
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

export const extractStructuredGlossaryEntries = (raw: string) => {
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

export const parseGlossary = (assets: NormalizedGroundTruthAsset[]) =>
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

export const dedupeGlossaryTerms = (entries: ParsedGlossaryTerm[]): ParsedGlossaryTerm[] => {
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
