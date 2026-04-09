import type { LectureSession } from '@domain/entities/LectureSession';
import type { GroundTruthUploadAsset } from '@shared/types/GroundTruthUploadAsset';

export interface GroundTruthImportOptions {
  mergeIntoSessionId?: string | null;
}

export interface GroundTruthImportService {
  importFromAssets(
    assets: GroundTruthUploadAsset[],
    sourceLabel: string,
    options?: GroundTruthImportOptions,
  ): Promise<LectureSession>;
}
