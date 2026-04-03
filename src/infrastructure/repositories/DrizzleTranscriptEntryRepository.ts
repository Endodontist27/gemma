import { asc, eq } from 'drizzle-orm';

import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import {
  mapTranscriptEntryRecord,
  toTranscriptEntryInsert,
} from '@infrastructure/database/mappers';
import { transcriptEntries } from '@infrastructure/database/schema';

export class DrizzleTranscriptEntryRepository implements TranscriptEntryRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db.query.transcriptEntries.findMany({
      where: eq(transcriptEntries.sessionId, sessionId),
      orderBy: [
        asc(transcriptEntries.orderIndex),
        asc(transcriptEntries.startedAtSeconds),
        asc(transcriptEntries.id),
      ],
    });

    return rows.map(mapTranscriptEntryRecord);
  }

  async saveMany(entries: TranscriptEntry[]) {
    if (!entries.length) {
      return;
    }

    await this.db.insert(transcriptEntries).values(entries.map(toTranscriptEntryInsert));
  }
}
