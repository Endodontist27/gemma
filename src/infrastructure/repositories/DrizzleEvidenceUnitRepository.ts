import { asc, eq } from 'drizzle-orm';

import type { DatabaseClient } from '@infrastructure/database/client';
import type {
  EvidenceUnitRepository,
  EvidenceUnitSearchResult,
} from '@domain/repository-contracts/EvidenceUnitRepository';
import { mapEvidenceUnitRecord, toEvidenceUnitInsert } from '@infrastructure/database/mappers';
import { evidenceUnits } from '@infrastructure/database/schema';
import type { EvidenceUnit } from '@domain/entities/EvidenceUnit';

const buildFtsQuery = (query: string) =>
  query
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 2)
    .slice(0, 8)
    .map((term) => `${term}*`)
    .join(' OR ');

export class DrizzleEvidenceUnitRepository implements EvidenceUnitRepository {
  constructor(private readonly databaseClient: DatabaseClient) {}

  async listBySession(sessionId: string) {
    const rows = await this.databaseClient.drizzle
      .select()
      .from(evidenceUnits)
      .where(eq(evidenceUnits.sessionId, sessionId))
      .orderBy(asc(evidenceUnits.createdAt), asc(evidenceUnits.id));

    return rows.map(mapEvidenceUnitRecord);
  }

  async listByAsset(assetId: string) {
    const rows = await this.databaseClient.drizzle
      .select()
      .from(evidenceUnits)
      .where(eq(evidenceUnits.assetId, assetId))
      .orderBy(asc(evidenceUnits.createdAt), asc(evidenceUnits.id));

    return rows.map(mapEvidenceUnitRecord);
  }

  async findById(id: string) {
    const rows = await this.databaseClient.drizzle
      .select()
      .from(evidenceUnits)
      .where(eq(evidenceUnits.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapEvidenceUnitRecord(row) : null;
  }

  async saveMany(units: EvidenceUnit[]) {
    if (!units.length) {
      return;
    }

    await this.databaseClient.drizzle
      .insert(evidenceUnits)
      .values(units.map(toEvidenceUnitInsert))
      .run();
  }

  async deleteByAsset(assetId: string) {
    await this.databaseClient.drizzle.delete(evidenceUnits).where(eq(evidenceUnits.assetId, assetId)).run();
  }

  async search(sessionId: string, query: string, limit: number): Promise<EvidenceUnitSearchResult[]> {
    const ftsQuery = buildFtsQuery(query);

    if (!ftsQuery) {
      return [];
    }

    const rows = await this.databaseClient.sqlite.getAllAsync<{
      id: string;
      rank: number;
    }>(
      `SELECT e.id as id, bm25(evidence_units_fts, 6.0, 1.0, 1.0, 0.5) AS rank
       FROM evidence_units_fts
       JOIN evidence_units e ON e.id = evidence_units_fts.id
       WHERE evidence_units_fts MATCH ? AND e.session_id = ?
       ORDER BY rank
       LIMIT ?`,
      ftsQuery,
      sessionId,
      limit,
    );

    if (!rows.length) {
      return [];
    }

    const units = await Promise.all(rows.map((row) => this.findById(row.id)));
    return rows.flatMap((row, index) => {
      const unit = units[index];
      if (!unit) {
        return [];
      }

      return [{ unit, rank: Math.abs(row.rank) }];
    });
  }
}
