import type { EvidenceUnitRepository } from '@domain/repository-contracts/EvidenceUnitRepository';
import type { AnswerSourceDetailDto } from '@application/dto/AnswerSourceDetailDto';
import type { AnswerSourceRepository } from '@domain/repository-contracts/AnswerSourceRepository';
import type { UploadedAssetRepository } from '@domain/repository-contracts/UploadedAssetRepository';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';
import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { LectureMaterialRepository } from '@domain/repository-contracts/LectureMaterialRepository';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type { BookmarkTargetType } from '@domain/value-objects/KnowledgeEnums';

const toBookmarkTargetType = (
  sourceType: AnswerSourceDetailDto['sourceType'],
): BookmarkTargetType => sourceType;

export class GetAnswerSourceDetailUseCase {
  constructor(
    private readonly answerSourceRepository: AnswerSourceRepository,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly glossaryTermRepository: GlossaryTermRepository,
    private readonly materialChunkRepository: MaterialChunkRepository,
    private readonly transcriptEntryRepository: TranscriptEntryRepository,
    private readonly lectureMaterialRepository: LectureMaterialRepository,
    private readonly evidenceUnitRepository: EvidenceUnitRepository,
    private readonly uploadedAssetRepository: UploadedAssetRepository,
  ) {}

  async execute(answerSourceId: string): Promise<AnswerSourceDetailDto | null> {
    const answerSource = await this.answerSourceRepository.findById(answerSourceId);
    if (!answerSource) {
      return null;
    }

    const bookmark = await this.bookmarkRepository.findByTarget(
      answerSource.sessionId,
      toBookmarkTargetType(answerSource.sourceType),
      answerSource.sourceRecordId,
    );

    if (answerSource.sourceType === 'glossary_term') {
      const glossaryTerm = await this.glossaryTermRepository.findById(answerSource.sourceRecordId);
      if (!glossaryTerm) {
        return null;
      }

      return {
        answerSource,
        sourceType: answerSource.sourceType,
        sourceRecordId: answerSource.sourceRecordId,
        citedExcerpt: answerSource.excerpt,
        relevanceScore: answerSource.relevanceScore,
        bookmark,
        sourcePayload: {
          kind: 'glossary_term',
          term: glossaryTerm.term,
          definition: glossaryTerm.definition,
          aliases: glossaryTerm.aliases,
        },
      };
    }

    if (answerSource.sourceType === 'material_chunk') {
      const chunk = await this.materialChunkRepository.findById(answerSource.sourceRecordId);
      if (!chunk) {
        return null;
      }

      const material = await this.lectureMaterialRepository.findById(chunk.materialId);
      if (!material) {
        return null;
      }

      return {
        answerSource,
        sourceType: answerSource.sourceType,
        sourceRecordId: answerSource.sourceRecordId,
        citedExcerpt: answerSource.excerpt,
        relevanceScore: answerSource.relevanceScore,
        bookmark,
        sourcePayload: {
          kind: 'material_chunk',
          materialTitle: material.title,
          heading: chunk.heading,
          text: chunk.text,
          keywords: chunk.keywords,
        },
      };
    }

    if (answerSource.sourceType === 'transcript_entry') {
      const transcriptEntry = await this.transcriptEntryRepository.findById(
        answerSource.sourceRecordId,
      );
      if (!transcriptEntry) {
        return null;
      }

      return {
        answerSource,
        sourceType: answerSource.sourceType,
        sourceRecordId: answerSource.sourceRecordId,
        citedExcerpt: answerSource.excerpt,
        relevanceScore: answerSource.relevanceScore,
        bookmark,
        sourcePayload: {
          kind: 'transcript_entry',
          speakerLabel: transcriptEntry.speakerLabel,
          text: transcriptEntry.text,
          startedAtSeconds: transcriptEntry.startedAtSeconds,
        },
      };
    }

    const evidenceUnit = await this.evidenceUnitRepository.findById(answerSource.sourceRecordId);
    if (!evidenceUnit) {
      return null;
    }

    const uploadedAsset = await this.uploadedAssetRepository.findById(evidenceUnit.assetId);
    if (!uploadedAsset) {
      return null;
    }

    return {
      answerSource,
      sourceType: answerSource.sourceType,
      sourceRecordId: answerSource.sourceRecordId,
      citedExcerpt: answerSource.excerpt,
      relevanceScore: answerSource.relevanceScore,
      bookmark,
      sourcePayload: {
        kind: 'evidence_unit',
        assetFileName: uploadedAsset.fileName,
        modality: evidenceUnit.modality,
        title: evidenceUnit.title,
        text: evidenceUnit.contentText,
        pageNumber: evidenceUnit.pageNumber,
        slideNumber: evidenceUnit.slideNumber,
        frameLabel: evidenceUnit.frameLabel,
        timestampStartSeconds: evidenceUnit.timestampStartSeconds,
        timestampEndSeconds: evidenceUnit.timestampEndSeconds,
        previewUri: evidenceUnit.previewUri,
      },
    };
  }
}
