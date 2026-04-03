import type { MaterialsSnapshotDto } from '@application/dto/MaterialsSnapshotDto';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';
import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { LectureMaterialRepository } from '@domain/repository-contracts/LectureMaterialRepository';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';

export class ListMaterialsUseCase {
  constructor(
    private readonly lectureMaterialRepository: LectureMaterialRepository,
    private readonly materialChunkRepository: MaterialChunkRepository,
    private readonly glossaryTermRepository: GlossaryTermRepository,
    private readonly bookmarkRepository: BookmarkRepository,
  ) {}

  async execute(sessionId: string): Promise<MaterialsSnapshotDto> {
    const [materials, chunks, glossary, bookmarks] = await Promise.all([
      this.lectureMaterialRepository.listBySession(sessionId),
      this.materialChunkRepository.listBySession(sessionId),
      this.glossaryTermRepository.listBySession(sessionId),
      this.bookmarkRepository.listBySession(sessionId),
    ]);

    return {
      materials,
      chunks,
      glossary,
      bookmarks,
    };
  }
}
