import type { SessionWorkspaceDto } from '@application/dto/SessionWorkspaceDto';
import type { LectureMaterial } from '@domain/entities/LectureMaterial';
import type { LectureMaterialRepository } from '@domain/repository-contracts/LectureMaterialRepository';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type { UploadedAssetRepository } from '@domain/repository-contracts/UploadedAssetRepository';

const collectSourceFiles = (materials: LectureMaterial[], uploadedFileNames: string[]) => {
  const seen = new Set<string>();
  const sourceFiles: string[] = [];

  for (const fileName of uploadedFileNames) {
    const normalized = fileName.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    sourceFiles.push(normalized);
  }

  for (const material of materials) {
    const label = material.sourceLabel.trim();
    if (!label || seen.has(label)) {
      continue;
    }

    seen.add(label);
    sourceFiles.push(label);
  }

  return sourceFiles;
};

export class ListSessionWorkspacesUseCase {
  constructor(
    private readonly lectureSessionRepository: LectureSessionRepository,
    private readonly lectureMaterialRepository: LectureMaterialRepository,
    private readonly uploadedAssetRepository: UploadedAssetRepository,
  ) {}

  async execute(): Promise<SessionWorkspaceDto[]> {
    const sessions = await this.lectureSessionRepository.list();

    return Promise.all(
      sessions.map(async (session) => {
        const [materials, uploadedAssets] = await Promise.all([
          this.lectureMaterialRepository.listBySession(session.id),
          this.uploadedAssetRepository.listBySession(session.id),
        ]);

        return {
          session,
          sourceFiles: collectSourceFiles(
            materials,
            uploadedAssets.map((asset) => asset.fileName),
          ),
          materialCount: materials.length,
          indexedAssets: uploadedAssets.map((asset) => ({
            id: asset.id,
            fileName: asset.fileName,
            status: asset.status,
            sourceExtension: asset.sourceExtension,
            errorMessage: asset.errorMessage,
            indexedAt: asset.indexedAt,
          })),
        } satisfies SessionWorkspaceDto;
      }),
    );
  }
}
