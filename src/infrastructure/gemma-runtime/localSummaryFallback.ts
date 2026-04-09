import type { MaterialChunk } from '@domain/entities/MaterialChunk';
import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';
import { limitSummaryText } from '@infrastructure/gemma-runtime/prompting';
import { toExcerpt, uniqueStrings } from '@shared/utils/text';

const joinNaturalList = (items: string[]) => {
  if (!items.length) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

const cleanTopic = (value: string) => value.trim().replace(/[.!?]+$/g, '');

const toSentence = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.replace(/\s+/g, ' ');

  if (/[.!?]$/.test(normalized)) {
    return normalized;
  }

  return `${normalized}.`;
};

const collectTopics = (chunks: MaterialChunk[]) =>
  uniqueStrings(
    chunks
      .flatMap((chunk) => [chunk.heading, ...chunk.keywords])
      .map(cleanTopic)
      .filter(Boolean),
  ).slice(0, 4);

export const buildSummaryEvidence = (
  chunks: MaterialChunk[],
  transcriptEntries: TranscriptEntry[],
) => [
  ...chunks.slice(0, 3).map((chunk) => `${chunk.heading}: ${chunk.text}`),
  ...transcriptEntries.slice(0, 2).map((entry) => `${entry.speakerLabel}: ${entry.text}`),
];

export const buildFallbackOverview = (
  chunks: MaterialChunk[],
  transcriptEntries: TranscriptEntry[],
) => {
  const topics = collectTopics(chunks);
  const sentences: string[] = [];

  if (topics.length) {
    sentences.push(`The session focuses on ${joinNaturalList(topics)}.`);
  }

  if (chunks[0]?.text) {
    sentences.push(toSentence(toExcerpt(chunks[0].text, 160)));
  }

  if (transcriptEntries[0]?.text) {
    sentences.push(
      `The lecture also emphasizes that ${toSentence(toExcerpt(transcriptEntries[0].text, 140)).replace(/^[A-Z]/, (value) => value.toLowerCase())}`,
    );
  }

  if (!sentences.length) {
    return 'This session does not include enough imported lecture material or transcript evidence to build a local summary yet.';
  }

  return limitSummaryText(sentences.join(' '));
};

export const buildKeyPointsSummary = (
  chunks: MaterialChunk[],
  transcriptEntries: TranscriptEntry[],
) => {
  const chunkHeadings = chunks
    .slice(0, 3)
    .map((chunk) => cleanTopic(chunk.heading))
    .filter(Boolean);

  if (chunkHeadings.length) {
    return joinNaturalList(chunkHeadings);
  }

  const transcriptHighlights = transcriptEntries
    .slice(0, 3)
    .map((entry) => toExcerpt(entry.text, 72))
    .filter(Boolean);

  if (transcriptHighlights.length) {
    return transcriptHighlights.join(' | ');
  }

  return 'Import lecture materials to extract key points for this session.';
};

export const buildExamFocusSummary = (chunks: MaterialChunk[]) => {
  const topics = collectTopics(chunks).slice(0, 3);

  if (!topics.length) {
    return 'Import lecture materials so the app can surface an exam-focused review from local evidence.';
  }

  return `Review ${joinNaturalList(topics)}. Be ready to explain each point using only the local lecture evidence.`;
};
