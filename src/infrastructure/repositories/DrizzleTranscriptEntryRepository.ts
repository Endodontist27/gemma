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

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(transcriptEntries)
      .where(eq(transcriptEntries.id, id))
      .limit(1);
    const row = rows[0];

    return row ? mapTranscriptEntryRecord(row) : null;
  }

  async listBySession(sessionId: string) {
    const rows = await this.db
      .select()
      .from(transcriptEntries)
      .where(eq(transcriptEntries.sessionId, sessionId))
      .orderBy(
        asc(transcriptEntries.orderIndex),
        asc(transcriptEntries.startedAtSeconds),
        asc(transcriptEntries.id),
      );

    return rows.map(mapTranscriptEntryRecord);
  }

  async saveMany(entries: TranscriptEntry[]) {
    if (!entries.length) {
      return;
    }

    await this.db.insert(transcriptEntries).values(entries.map(toTranscriptEntryInsert)).run();
  }
}
