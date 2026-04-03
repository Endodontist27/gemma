import type { LectureSession } from '@domain/entities/LectureSession';

export interface LecturePackImportService {
  importFromJson(rawPack: string, sourceLabel: string): Promise<LectureSession>;
}
