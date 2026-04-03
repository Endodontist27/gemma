import type { LectureSession } from '@domain/entities/LectureSession';
import type { LecturePackImportService } from '@domain/service-contracts/LecturePackImportService';
import type { AppDatabase } from '@infrastructure/database/client';
import { buildSessionGraph } from '@infrastructure/lecture-pack/import/buildSessionGraph';
import { parseLecturePack } from '@infrastructure/lecture-pack/import/parseLecturePack';
import { persistLecturePack } from '@infrastructure/lecture-pack/import/persistLecturePack';
import { nowIso } from '@shared/utils/dates';

export class LecturePackImporter implements LecturePackImportService {
  constructor(private readonly db: AppDatabase) {}

  async importFromJson(rawPack: string, sourceLabel: string): Promise<LectureSession> {
    const parsed = parseLecturePack(rawPack);
    const timestamp = nowIso();
    const graph = buildSessionGraph(parsed, sourceLabel, timestamp);
    persistLecturePack(this.db, graph);

    return graph.session;
  }
}
