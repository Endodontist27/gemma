import { asc, eq, and, isNull } from 'drizzle-orm';

import type { AssetDigest } from '@domain/entities/AssetDigest';
import type { AssetDigestRepository } from '@domain/repository-contracts/AssetDigestRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapAssetDigestRecord, toAssetDigestInsert } from '@infrastructure/database/mappers';
import { assetDigests } from '@infrastructure/database/schema';

export class DrizzleAssetDigestRepository implements AssetDigestRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db
      .select()
      .from(assetDigests)
      .where(eq(assetDigests.sessionId, sessionId))
      .orderBy(asc(assetDigests.createdAt), asc(assetDigests.id));

    return rows.map(mapAssetDigestRecord);
  }

  async findSessionDigest(sessionId: string) {
    const rows = await this.db
      .select()
      .from(assetDigests)
      .where(
        and(eq(assetDigests.sessionId, sessionId), eq(assetDigests.kind, 'session_summary'), isNull(assetDigests.assetId)),
      )
      .limit(1);
    const row = rows[0];
    return row ? mapAssetDigestRecord(row) : null;
  }

  async findByAsset(assetId: string) {
    const rows = await this.db
      .select()
      .from(assetDigests)
      .where(and(eq(assetDigests.assetId, assetId), eq(assetDigests.kind, 'asset_summary')))
      .limit(1);
    const row = rows[0];
    return row ? mapAssetDigestRecord(row) : null;
  }

  async save(digest: AssetDigest) {
    if (digest.kind === 'session_summary') {
      await this.db
        .delete(assetDigests)
        .where(and(eq(assetDigests.sessionId, digest.sessionId), eq(assetDigests.kind, 'session_summary')))
        .run();
      await this.db.insert(assetDigests).values(toAssetDigestInsert(digest)).run();
      return;
    }

    await this.db
      .insert(assetDigests)
      .values(toAssetDigestInsert(digest))
      .onConflictDoUpdate({
        target: [assetDigests.assetId, assetDigests.kind],
        set: {
          title: digest.title,
          text: digest.text,
          updatedAt: digest.updatedAt,
        },
      })
      .run();
  }

  async saveMany(digests: AssetDigest[]) {
    for (const digest of digests) {
      await this.save(digest);
    }
  }

  async deleteByAsset(assetId: string) {
    await this.db.delete(assetDigests).where(eq(assetDigests.assetId, assetId)).run();
  }
}
