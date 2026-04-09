import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';

export interface TranscriptEntryRepository {
  /** Ordered by transcript order index, then start time, then stable id order. */
  listBySession(sessionId: string): Promise<TranscriptEntry[]>;
  findById(id: string): Promise<TranscriptEntry | null>;
  saveMany(entries: TranscriptEntry[]): Promise<void>;
}
