import type { MaterialChunk } from '@domain/entities/MaterialChunk';

export interface MaterialChunkRepository {
  /** Ordered by material order, then chunk order, then stable id order. */
  listBySession(sessionId: string): Promise<MaterialChunk[]>;
  /** Ordered by chunk order index, then stable id order. */
  listByMaterial(materialId: string): Promise<MaterialChunk[]>;
  findById(id: string): Promise<MaterialChunk | null>;
  saveMany(chunks: MaterialChunk[]): Promise<void>;
}
