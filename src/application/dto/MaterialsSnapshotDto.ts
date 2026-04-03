import type { Bookmark } from '@domain/entities/Bookmark';
import type { GlossaryTerm } from '@domain/entities/GlossaryTerm';
import type { LectureMaterial } from '@domain/entities/LectureMaterial';
import type { MaterialChunk } from '@domain/entities/MaterialChunk';

export interface MaterialsSnapshotDto {
  materials: LectureMaterial[];
  chunks: MaterialChunk[];
  glossary: GlossaryTerm[];
  bookmarks: Bookmark[];
}
