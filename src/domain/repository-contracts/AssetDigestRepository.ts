import type { AssetDigest } from '@domain/entities/AssetDigest';

export interface AssetDigestRepository {
  listBySession(sessionId: string): Promise<AssetDigest[]>;
  findSessionDigest(sessionId: string): Promise<AssetDigest | null>;
  findByAsset(assetId: string): Promise<AssetDigest | null>;
  save(digest: AssetDigest): Promise<void>;
  saveMany(digests: AssetDigest[]): Promise<void>;
  deleteByAsset(assetId: string): Promise<void>;
}
