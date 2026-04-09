import { AssetDigestSchema, type AssetDigest } from '@domain/entities/AssetDigest';
import { EvidenceUnitSchema, type EvidenceUnit } from '@domain/entities/EvidenceUnit';
import { UploadedAssetSchema, type UploadedAsset } from '@domain/entities/UploadedAsset';
import {
  assetDigests,
  evidenceUnits,
  uploadedAssets,
} from '@infrastructure/database/schema';

export const mapUploadedAssetRecord = (
  record: typeof uploadedAssets.$inferSelect,
): UploadedAsset =>
  UploadedAssetSchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    fileName: record.fileName,
    mediaType: record.mediaType,
    sourceKind: record.sourceKind,
    sourceExtension: record.sourceExtension,
    checksum: record.checksum,
    sizeBytes: record.sizeBytes,
    status: record.status,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    indexedAt: record.indexedAt,
  });

export const toUploadedAssetInsert = (
  entity: UploadedAsset,
): typeof uploadedAssets.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  fileName: entity.fileName,
  mediaType: entity.mediaType,
  sourceKind: entity.sourceKind,
  sourceExtension: entity.sourceExtension,
  checksum: entity.checksum,
  sizeBytes: entity.sizeBytes,
  status: entity.status,
  errorMessage: entity.errorMessage,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
  indexedAt: entity.indexedAt,
});

export const mapEvidenceUnitRecord = (
  record: typeof evidenceUnits.$inferSelect,
): EvidenceUnit =>
  EvidenceUnitSchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    assetId: record.assetId,
    sourceType: record.sourceType,
    sourceRecordId: record.sourceRecordId,
    modality: record.modality,
    title: record.title,
    excerpt: record.excerpt,
    contentText: record.contentText,
    searchText: record.searchText,
    pageNumber: record.pageNumber,
    slideNumber: record.slideNumber,
    frameLabel: record.frameLabel,
    timestampStartSeconds: record.timestampStartSeconds,
    timestampEndSeconds: record.timestampEndSeconds,
    previewUri: record.previewUri,
    metadataJson: record.metadataJson,
    createdAt: record.createdAt,
  });

export const toEvidenceUnitInsert = (
  entity: EvidenceUnit,
): typeof evidenceUnits.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  assetId: entity.assetId,
  sourceType: entity.sourceType,
  sourceRecordId: entity.sourceRecordId,
  modality: entity.modality,
  title: entity.title,
  excerpt: entity.excerpt,
  contentText: entity.contentText,
  searchText: entity.searchText,
  pageNumber: entity.pageNumber,
  slideNumber: entity.slideNumber,
  frameLabel: entity.frameLabel,
  timestampStartSeconds: entity.timestampStartSeconds,
  timestampEndSeconds: entity.timestampEndSeconds,
  previewUri: entity.previewUri,
  metadataJson: entity.metadataJson,
  createdAt: entity.createdAt,
});

export const mapAssetDigestRecord = (
  record: typeof assetDigests.$inferSelect,
): AssetDigest =>
  AssetDigestSchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    assetId: record.assetId,
    kind: record.kind,
    title: record.title,
    text: record.text,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

export const toAssetDigestInsert = (
  entity: AssetDigest,
): typeof assetDigests.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  assetId: entity.assetId,
  kind: entity.kind,
  title: entity.title,
  text: entity.text,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});
