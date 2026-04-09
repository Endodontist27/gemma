import type { AssetDigestRepository } from '@domain/repository-contracts/AssetDigestRepository';
import type { EvidenceUnitRepository } from '@domain/repository-contracts/EvidenceUnitRepository';
import type { UploadedAssetRepository } from '@domain/repository-contracts/UploadedAssetRepository';
import type { GroundTruthUploadAsset } from '@shared/types/GroundTruthUploadAsset';
import { logDev } from '@shared/utils/debug';
import { nowIso } from '@shared/utils/dates';
import { createEntityId } from '@shared/utils/ids';
import { normalizeText, toExcerpt } from '@shared/utils/text';

import type {
  DesktopBridgeEvidenceUnitPayload,
  DesktopMultimodalBridgeClient,
} from '@infrastructure/gemma-runtime/DesktopMultimodalBridgeClient';

import type { GroundTruthAssetKind, NormalizedGroundTruthAsset } from './types';

type IndexableGroundTruthAssetKind = Exclude<GroundTruthAssetKind, 'session'>;

const TEXT_CHUNK_SIZE = 900;

const chunkText = (text: string) => {
  const segments = text
    .split(/\n\s*\n+/)
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const segment of segments) {
    const next = current ? `${current} ${segment}` : segment;
    if (current && next.length > TEXT_CHUNK_SIZE) {
      chunks.push(current);
      current = segment;
      continue;
    }
    current = next;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length ? chunks : [text.replace(/\s+/g, ' ').trim()].filter(Boolean);
};

const buildLocalEvidenceUnits = (
  sessionId: string,
  assetId: string,
  asset: GroundTruthUploadAsset & {
    extension: string;
    sourceKind: IndexableGroundTruthAssetKind;
  },
  normalizedAsset?: NormalizedGroundTruthAsset,
) => {
  const sourceText = normalizedAsset?.textContent?.trim() ?? '';
  if (!sourceText) {
    return [];
  }

  return chunkText(sourceText).map((chunk, index) => ({
    id: createEntityId('evidence_unit'),
    sessionId,
    assetId,
    sourceType: 'asset' as const,
    sourceRecordId: null,
    modality:
      asset.extension === 'pdf'
        ? ('pdf' as const)
        : asset.extension === 'pptx'
          ? ('slide' as const)
          : ('text' as const),
    title: `${asset.name} | Passage ${index + 1}`,
    excerpt: toExcerpt(chunk, 240),
    contentText: chunk,
    searchText: normalizeText(`${asset.name} ${chunk}`),
    pageNumber: null,
    slideNumber: asset.extension === 'pptx' ? index + 1 : null,
    frameLabel: null,
    timestampStartSeconds: null,
    timestampEndSeconds: null,
    previewUri: null,
    metadataJson: null,
    createdAt: nowIso(),
  }));
};

const mapBridgeUnit = (
  sessionId: string,
  assetId: string,
  payload: DesktopBridgeEvidenceUnitPayload,
) => ({
  id: createEntityId('evidence_unit'),
  sessionId,
  assetId,
  sourceType: 'asset' as const,
  sourceRecordId: null,
  modality: payload.modality,
  title: payload.title,
  excerpt: payload.excerpt,
  contentText: payload.contentText,
  searchText: normalizeText(payload.searchText || `${payload.title} ${payload.contentText}`),
  pageNumber: payload.pageNumber ?? null,
  slideNumber: payload.slideNumber ?? null,
  frameLabel: payload.frameLabel ?? null,
  timestampStartSeconds: payload.timestampStartSeconds ?? null,
  timestampEndSeconds: payload.timestampEndSeconds ?? null,
  previewUri: payload.previewUri ?? null,
  metadataJson: payload.metadataJson ?? null,
  createdAt: nowIso(),
});

export class MultimodalAssetIndexingService {
  private queue = Promise.resolve();

  constructor(
    private readonly uploadedAssetRepository: UploadedAssetRepository,
    private readonly evidenceUnitRepository: EvidenceUnitRepository,
    private readonly assetDigestRepository: AssetDigestRepository,
    private readonly desktopBridgeClient: DesktopMultimodalBridgeClient | null,
  ) {}

  queueAssets(
    sessionId: string,
    assets: (GroundTruthUploadAsset & {
      extension: string;
      sourceKind: IndexableGroundTruthAssetKind;
    })[],
    normalizedAssets: NormalizedGroundTruthAsset[],
  ) {
    const normalizedByName = new Map(normalizedAssets.map((asset) => [asset.name, asset]));
    const createdAt = nowIso();
    const uploadedAssets = assets.map((asset) => ({
      id: createEntityId('uploaded_asset'),
      sessionId,
      fileName: asset.name,
      mediaType: asset.mimeType ?? 'application/octet-stream',
      sourceKind: asset.sourceKind,
      sourceExtension: asset.extension,
      checksum: asset.checksum ?? null,
      sizeBytes: asset.sizeBytes ?? null,
      status: 'pending' as const,
      errorMessage: null,
      createdAt,
      updatedAt: createdAt,
      indexedAt: null,
    }));

    this.queue = this.queue
      .then(async () => {
        await this.uploadedAssetRepository.saveMany(uploadedAssets);

        for (const uploadedAsset of uploadedAssets) {
          const sourceAsset = assets.find((asset) => asset.name === uploadedAsset.fileName);
          if (!sourceAsset) {
            continue;
          }

          const normalizedAsset = normalizedByName.get(uploadedAsset.fileName);
          await this.processAsset(uploadedAsset.id, sessionId, sourceAsset, normalizedAsset);
        }

        await this.updateSessionDigest(sessionId);
      })
      .catch((error) => {
        logDev('multimodal-index', 'Background indexing queue failed', {
          sessionId,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      });
  }

  private async processAsset(
    assetId: string,
    sessionId: string,
    asset: GroundTruthUploadAsset & {
      extension: string;
      sourceKind: IndexableGroundTruthAssetKind;
    },
    normalizedAsset?: NormalizedGroundTruthAsset,
  ) {
    await this.uploadedAssetRepository.updateStatus(assetId, 'processing');

    try {
      await this.evidenceUnitRepository.deleteByAsset(assetId);
      await this.assetDigestRepository.deleteByAsset(assetId);

      const localUnits = buildLocalEvidenceUnits(sessionId, assetId, asset, normalizedAsset);
      const bridgePayload = this.desktopBridgeClient
        ? await this.desktopBridgeClient.ingestAsset(sessionId, assetId, {
            ...asset,
            textContent: normalizedAsset?.textContent ?? asset.textContent ?? null,
          })
        : null;
      const units = [
        ...localUnits,
        ...(bridgePayload?.units.map((unit) => mapBridgeUnit(sessionId, assetId, unit)) ?? []),
      ];

      if (units.length) {
        await this.evidenceUnitRepository.saveMany(units);
      }

      if (bridgePayload?.digest) {
        const timestamp = nowIso();
        await this.assetDigestRepository.save({
          id: createEntityId('asset_digest'),
          sessionId,
          assetId,
          kind: 'asset_summary',
          title: bridgePayload.digest.title,
          text: bridgePayload.digest.text,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } else if (localUnits.length) {
        const timestamp = nowIso();
        await this.assetDigestRepository.save({
          id: createEntityId('asset_digest'),
          sessionId,
          assetId,
          kind: 'asset_summary',
          title: `${asset.name} summary`,
          text: localUnits.slice(0, 4).map((unit) => unit.contentText).join('\n\n'),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      await this.uploadedAssetRepository.updateStatus(assetId, 'ready', {
        indexedAt: nowIso(),
        errorMessage: null,
      });
    } catch (error) {
      await this.uploadedAssetRepository.updateStatus(assetId, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Indexing failed.',
        indexedAt: null,
      });
    }
  }

  private async updateSessionDigest(sessionId: string) {
    const digests = (await this.assetDigestRepository.listBySession(sessionId)).filter(
      (digest) => digest.kind === 'asset_summary',
    );

    if (!digests.length) {
      return;
    }

    const timestamp = nowIso();
    const summaryText = digests
      .map((digest) => `${digest.title}\n${toExcerpt(digest.text, 420)}`)
      .join('\n\n');

    await this.assetDigestRepository.save({
      id: createEntityId('asset_digest'),
      sessionId,
      assetId: null,
      kind: 'session_summary',
      title: 'Workspace session digest',
      text: summaryText,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
}
