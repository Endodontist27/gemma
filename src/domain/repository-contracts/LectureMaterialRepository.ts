import type { LectureMaterial } from '@domain/entities/LectureMaterial';

export interface LectureMaterialRepository {
  /** Ordered by material order index, then title, then stable id order. */
  listBySession(sessionId: string): Promise<LectureMaterial[]>;
  findById(id: string): Promise<LectureMaterial | null>;
  saveMany(materials: LectureMaterial[]): Promise<void>;
}
