import { asc, eq } from 'drizzle-orm';

import type { LectureMaterial } from '@domain/entities/LectureMaterial';
import type { LectureMaterialRepository } from '@domain/repository-contracts/LectureMaterialRepository';
import type { AppDatabaseExecutor } from '@infrastructure/database/client';
import {
  mapLectureMaterialRecord,
  toLectureMaterialInsert,
} from '@infrastructure/database/mappers';
import { lectureMaterials } from '@infrastructure/database/schema';

export class DrizzleLectureMaterialRepository implements LectureMaterialRepository {
  constructor(private readonly db: AppDatabaseExecutor) {}

  async listBySession(sessionId: string) {
    const rows = await this.db.query.lectureMaterials.findMany({
      where: eq(lectureMaterials.sessionId, sessionId),
      orderBy: [
        asc(lectureMaterials.orderIndex),
        asc(lectureMaterials.title),
        asc(lectureMaterials.id),
      ],
    });

    return rows.map(mapLectureMaterialRecord);
  }

  async findById(id: string) {
    const row = await this.db.query.lectureMaterials.findFirst({
      where: eq(lectureMaterials.id, id),
    });

    return row ? mapLectureMaterialRecord(row) : null;
  }

  async saveMany(materials: LectureMaterial[]) {
    if (!materials.length) {
      return;
    }

    await this.db.insert(lectureMaterials).values(materials.map(toLectureMaterialInsert));
  }
}
