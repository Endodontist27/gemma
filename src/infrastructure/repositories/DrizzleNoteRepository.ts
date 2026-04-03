import { desc, eq } from 'drizzle-orm';

import type { Note } from '@domain/entities/Note';
import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapNoteRecord, toNoteInsert } from '@infrastructure/database/mappers';
import { notes } from '@infrastructure/database/schema';

export class DrizzleNoteRepository implements NoteRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db.query.notes.findMany({
      where: eq(notes.sessionId, sessionId),
      orderBy: [desc(notes.pinned), desc(notes.updatedAt), desc(notes.createdAt), desc(notes.id)],
    });

    return rows.map(mapNoteRecord);
  }

  async save(note: Note) {
    await this.db.insert(notes).values(toNoteInsert(note));
  }
}
