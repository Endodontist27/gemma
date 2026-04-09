import type { LectureSession } from '@domain/entities/LectureSession';
import type { UploadedAssetStatus } from '@domain/entities/UploadedAsset';

export interface SessionWorkspaceIndexedAssetDto {
  id: string;
  fileName: string;
  status: UploadedAssetStatus;
  sourceExtension: string;
  errorMessage: string | null;
  indexedAt: string | null;
}

export interface SessionWorkspaceDto {
  session: LectureSession;
  sourceFiles: string[];
  materialCount: number;
  indexedAssets: SessionWorkspaceIndexedAssetDto[];
}
