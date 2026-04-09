import type { EvidenceUnitRepository } from '@domain/repository-contracts/EvidenceUnitRepository';
import type { NotesSnapshotDto } from '@application/dto/NotesSnapshotDto';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';
import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { LectureMaterialRepository } from '@domain/repository-contracts/LectureMaterialRepository';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type { UploadedAssetRepository } from '@domain/repository-contracts/UploadedAssetRepository';
import { formatSecondsAsTimestamp } from '@shared/utils/dates';

export class ListNotesUseCase {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly lectureMaterialRepository: LectureMaterialRepository,
    private readonly materialChunkRepository: MaterialChunkRepository,
    private readonly glossaryTermRepository: GlossaryTermRepository,
    private readonly transcriptEntryRepository: TranscriptEntryRepository,
    private readonly evidenceUnitRepository: EvidenceUnitRepository,
    private readonly uploadedAssetRepository: UploadedAssetRepository,
  ) {}

  async execute(sessionId: string): Promise<NotesSnapshotDto> {
    const [notes, bookmarks, materials, chunks, glossaryTerms, transcriptEntries, evidenceUnits, uploadedAssets] =
      await Promise.all([
      this.noteRepository.listBySession(sessionId),
      this.bookmarkRepository.listBySession(sessionId),
      this.lectureMaterialRepository.listBySession(sessionId),
      this.materialChunkRepository.listBySession(sessionId),
      this.glossaryTermRepository.listBySession(sessionId),
      this.transcriptEntryRepository.listBySession(sessionId),
      this.evidenceUnitRepository.listBySession(sessionId),
      this.uploadedAssetRepository.listBySession(sessionId),
    ]);

    const materialById = new Map(materials.map((material) => [material.id, material]));
    const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
    const glossaryById = new Map(glossaryTerms.map((term) => [term.id, term]));
    const transcriptById = new Map(transcriptEntries.map((entry) => [entry.id, entry]));
    const evidenceUnitById = new Map(evidenceUnits.map((unit) => [unit.id, unit]));
    const uploadedAssetById = new Map(uploadedAssets.map((asset) => [asset.id, asset]));

    return {
      notes: notes.map((note) => {
        if (note.anchorType === 'session') {
          return {
            note,
            anchorLabel: 'Session note',
            anchorTypeLabel: 'Session',
          };
        }

        if (note.anchorType === 'lecture_material') {
          const material = note.anchorId ? materialById.get(note.anchorId) : null;
          return {
            note,
            anchorLabel: material?.title ?? 'Lecture material',
            anchorTypeLabel: 'Lecture Material',
          };
        }

        if (note.anchorType === 'material_chunk') {
          const chunk = note.anchorId ? chunkById.get(note.anchorId) : null;
          return {
            note,
            anchorLabel: chunk?.heading ?? 'Material excerpt',
            anchorTypeLabel: 'Material Chunk',
          };
        }

        if (note.anchorType === 'glossary_term') {
          const glossaryTerm = note.anchorId ? glossaryById.get(note.anchorId) : null;
          return {
            note,
            anchorLabel: glossaryTerm?.term ?? 'Glossary term',
            anchorTypeLabel: 'Glossary Term',
          };
        }

        if (note.anchorType === 'evidence_unit') {
          const evidenceUnit = note.anchorId ? evidenceUnitById.get(note.anchorId) : null;
          const asset = evidenceUnit ? uploadedAssetById.get(evidenceUnit.assetId) : null;
          return {
            note,
            anchorLabel: evidenceUnit
              ? `${evidenceUnit.title}${asset ? ` · ${asset.fileName}` : ''}`
              : 'Indexed evidence',
            anchorTypeLabel: 'Evidence Unit',
          };
        }

        const transcriptEntry = note.anchorId ? transcriptById.get(note.anchorId) : null;
        return {
          note,
          anchorLabel: transcriptEntry
            ? `${transcriptEntry.speakerLabel} at ${formatSecondsAsTimestamp(
                transcriptEntry.startedAtSeconds,
              )}`
            : 'Transcript moment',
          anchorTypeLabel: 'Transcript Entry',
        };
      }),
      bookmarks,
    };
  }
}
