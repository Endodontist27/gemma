import { asc, eq } from 'drizzle-orm';

import type { GlossaryTerm } from '@domain/entities/GlossaryTerm';
import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapGlossaryTermRecord, toGlossaryTermInsert } from '@infrastructure/database/mappers';
import { glossaryTerms } from '@infrastructure/database/schema';

export class DrizzleGlossaryTermRepository implements GlossaryTermRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db.query.glossaryTerms.findMany({
      where: eq(glossaryTerms.sessionId, sessionId),
      orderBy: [asc(glossaryTerms.orderIndex), asc(glossaryTerms.term), asc(glossaryTerms.id)],
    });

    return rows.map(mapGlossaryTermRecord);
  }

  async saveMany(terms: GlossaryTerm[]) {
    if (!terms.length) {
      return;
    }

    await this.db.insert(glossaryTerms).values(terms.map(toGlossaryTermInsert));
  }
}
