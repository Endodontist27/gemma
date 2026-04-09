import type { UploadedAsset, UploadedAssetStatus } from '@domain/entities/UploadedAsset';

export interface UploadedAssetRepository {
  listBySession(sessionId: string): Promise<UploadedAsset[]>;
  findById(id: string): Promise<UploadedAsset | null>;
  save(asset: UploadedAsset): Promise<void>;
  saveMany(assets: UploadedAsset[]): Promise<void>;
  updateStatus(
    id: string,
    status: UploadedAssetStatus,
    options?: { errorMessage?: string | null; indexedAt?: string | null },
  ): Promise<void>;
}
