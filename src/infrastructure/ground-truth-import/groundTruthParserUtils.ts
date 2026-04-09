import type { SummaryKind } from '@domain/value-objects/LectureEnums';
import { normalizeText } from '@shared/utils/text';

import type { NormalizedGroundTruthAsset, PartialSessionMetadata } from './types';

export interface ParsedMaterialChunk {
  heading: string;
  text: string;
  keywords: string[];
  orderIndex: number;
}

export interface ParsedGlossaryTerm {
  id: string;
  term: string;
  aliases: string[];
  definition: string;
  orderIndex: number;
}

export interface ParsedTranscriptEntry {
  id: string;
  speakerLabel: string;
  text: string;
  startedAtSeconds: number;
  orderIndex: number;
}

export interface ParsedCategory {
  id: string;
  key: string;
  label: string;
  description: string;
}

export interface ParsedSummary {
  id: string;
  kind: SummaryKind;
  title: string;
  text: string;
}

export type { PartialSessionMetadata };

export const asSlug = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'item';

export const buildId = (prefix: string, value: string, fallbackIndex: number) =>
  `${prefix}_${asSlug(value)}${fallbackIndex > 0 ? `_${fallbackIndex}` : ''}`;

export const toDisplayTitle = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());

export const splitParagraphs = (raw: string) =>
  raw
    .split(/\n\s*\n+/)
    .map((section) => section.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

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

export const chunkLongPlainText = (raw: string) => {
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

export const parseMarkdownSections = (raw: string) => {
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

export const parseLooseKeyValueText = (raw: string) =>
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

export const parseJson = (asset: NormalizedGroundTruthAsset) => {
  try {
    return JSON.parse(asset.textContent);
  } catch {
    throw new Error(`Could not parse ${asset.name} as JSON.`);
  }
};
