import type { AnswerSource } from '@domain/entities/AnswerSource';
import type { Bookmark } from '@domain/entities/Bookmark';

export interface GlossaryAnswerSourcePayloadDto {
  kind: 'glossary_term';
  term: string;
  definition: string;
  aliases: string[];
}

export interface MaterialChunkAnswerSourcePayloadDto {
  kind: 'material_chunk';
  materialTitle: string;
  heading: string;
  text: string;
  keywords: string[];
}

export interface TranscriptAnswerSourcePayloadDto {
  kind: 'transcript_entry';
  speakerLabel: string;
  text: string;
  startedAtSeconds: number;
}

export interface EvidenceUnitAnswerSourcePayloadDto {
  kind: 'evidence_unit';
  assetFileName: string;
  modality: 'text' | 'image' | 'video' | 'pdf' | 'slide';
  title: string;
  text: string;
  pageNumber: number | null;
  slideNumber: number | null;
  frameLabel: string | null;
  timestampStartSeconds: number | null;
  timestampEndSeconds: number | null;
  previewUri: string | null;
}

export type AnswerSourcePayloadDto =
  | GlossaryAnswerSourcePayloadDto
  | MaterialChunkAnswerSourcePayloadDto
  | TranscriptAnswerSourcePayloadDto
  | EvidenceUnitAnswerSourcePayloadDto;

export interface AnswerSourceDetailDto {
  answerSource: AnswerSource;
  sourceType: AnswerSource['sourceType'];
  sourceRecordId: AnswerSource['sourceRecordId'];
  citedExcerpt: AnswerSource['excerpt'];
  relevanceScore: number;
  bookmark: Bookmark | null;
  sourcePayload: AnswerSourcePayloadDto;
}
