import { asc, eq } from 'drizzle-orm';

import type { MaterialChunk } from '@domain/entities/MaterialChunk';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import { mapMaterialChunkRecord, toMaterialChunkInsert } from '@infrastructure/database/mappers';
import { lectureMaterials, materialChunks } from '@infrastructure/database/schema';

export class DrizzleMaterialChunkRepository implements MaterialChunkRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db
      .select({ chunk: materialChunks })
      .from(materialChunks)
      .innerJoin(lectureMaterials, eq(materialChunks.materialId, lectureMaterials.id))
      .where(eq(materialChunks.sessionId, sessionId))
      .orderBy(
        asc(lectureMaterials.orderIndex),
        asc(materialChunks.orderIndex),
        asc(materialChunks.id),
      );

    return rows.map(({ chunk }) => mapMaterialChunkRecord(chunk));
  }

  async listByMaterial(materialId: string) {
    const rows = await this.db.query.materialChunks.findMany({
      where: eq(materialChunks.materialId, materialId),
      orderBy: [asc(materialChunks.orderIndex), asc(materialChunks.id)],
    });

    return rows.map(mapMaterialChunkRecord);
  }

  async saveMany(chunks: MaterialChunk[]) {
    if (!chunks.length) {
      return;
    }

    await this.db.insert(materialChunks).values(chunks.map(toMaterialChunkInsert));
  }
}
