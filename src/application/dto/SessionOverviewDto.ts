import type { LectureSession } from '@domain/entities/LectureSession';
import type { Summary } from '@domain/entities/Summary';
import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';

export interface SessionOverviewDto {
  session: LectureSession;
  summaries: Summary[];
  latestTranscriptEntries: TranscriptEntry[];
}
