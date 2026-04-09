import type { LectureSession } from '@domain/entities/LectureSession';
import type { Summary } from '@domain/entities/Summary';
import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';

export interface SessionOverviewCountsDto {
  materialCount: number;
  chunkCount: number;
  glossaryTermCount: number;
  transcriptEntryCount: number;
  publicQuestionCount: number;
  noteCount: number;
  bookmarkCount: number;
}

export interface SessionOverviewDto {
  session: LectureSession;
  summaries: Summary[];
  counts: SessionOverviewCountsDto;
  transcriptEntries: TranscriptEntry[];
  latestTranscriptEntries: TranscriptEntry[];
}
