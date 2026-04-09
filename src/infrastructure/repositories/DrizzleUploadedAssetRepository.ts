import { asc, eq } from 'drizzle-orm';

import type { UploadedAssetStatus, UploadedAsset } from '@domain/entities/UploadedAsset';
import type { UploadedAssetRepository } from '@domain/repository-contracts/UploadedAssetRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapUploadedAssetRecord, toUploadedAssetInsert } from '@infrastructure/database/mappers';
import { uploadedAssets } from '@infrastructure/database/schema';
import { nowIso } from '@shared/utils/dates';

export class DrizzleUploadedAssetRepository implements UploadedAssetRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db
      .select()
      .from(uploadedAssets)
      .where(eq(uploadedAssets.sessionId, sessionId))
      .orderBy(asc(uploadedAssets.createdAt), asc(uploadedAssets.fileName));

    return rows.map(mapUploadedAssetRecord);
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(uploadedAssets)
      .where(eq(uploadedAssets.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapUploadedAssetRecord(row) : null;
  }

  async save(asset: UploadedAsset) {
    await this.db
      .insert(uploadedAssets)
      .values(toUploadedAssetInsert(asset))
      .onConflictDoUpdate({
        target: uploadedAssets.id,
        set: {
          fileName: asset.fileName,
          mediaType: asset.mediaType,
          sourceKind: asset.sourceKind,
          sourceExtension: asset.sourceExtension,
          checksum: asset.checksum,
          sizeBytes: asset.sizeBytes,
          status: asset.status,
          errorMessage: asset.errorMessage,
          updatedAt: asset.updatedAt,
          indexedAt: asset.indexedAt,
        },
      })
      .run();
  }

  async saveMany(assets: UploadedAsset[]) {
    for (const asset of assets) {
      await this.save(asset);
    }
  }

  async updateStatus(
    id: string,
    status: UploadedAssetStatus,
    options?: { errorMessage?: string | null; indexedAt?: string | null },
  ) {
    await this.db
      .update(uploadedAssets)
      .set({
        status,
        errorMessage: options?.errorMessage ?? null,
        indexedAt: options?.indexedAt ?? null,
        updatedAt: nowIso(),
      })
      .where(eq(uploadedAssets.id, id))
      .run();
  }
}
