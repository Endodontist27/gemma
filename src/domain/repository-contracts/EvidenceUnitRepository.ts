import type { EvidenceUnit } from '@domain/entities/EvidenceUnit';

export interface EvidenceUnitSearchResult {
  unit: EvidenceUnit;
  rank: number;
}

export interface EvidenceUnitRepository {
  listBySession(sessionId: string): Promise<EvidenceUnit[]>;
  listByAsset(assetId: string): Promise<EvidenceUnit[]>;
  findById(id: string): Promise<EvidenceUnit | null>;
  saveMany(units: EvidenceUnit[]): Promise<void>;
  deleteByAsset(assetId: string): Promise<void>;
  search(sessionId: string, query: string, limit: number): Promise<EvidenceUnitSearchResult[]>;
}
