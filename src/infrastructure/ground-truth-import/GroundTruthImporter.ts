import { LecturePackDtoSchema } from '@application/dto/LecturePackDto';
import type { LectureSession } from '@domain/entities/LectureSession';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type {
  GroundTruthImportOptions,
  GroundTruthImportService,
} from '@domain/service-contracts/GroundTruthImportService';
import type { LecturePackImportService } from '@domain/service-contracts/LecturePackImportService';
import { nowIso } from '@shared/utils/dates';
import type { GroundTruthUploadAsset } from '@shared/types/GroundTruthUploadAsset';
import { logDev } from '@shared/utils/debug';
import { serializeError } from '@shared/utils/serialization';

import type { GroundTruthSessionAppender } from './GroundTruthSessionAppender';
import { buildGroundTruthLecturePack } from './buildGroundTruthLecturePack';
import { classifyGroundTruthAsset } from './classifyGroundTruthAsset';
import type { GroundTruthPdfTextExtractor } from './PdfTextExtractor';
import type { GroundTruthPptxTextExtractor } from './PptxTextExtractor';
import { prepareGroundTruthAssets } from './prepareGroundTruthAssets';
import { buildSessionGraph } from '@infrastructure/lecture-pack/import/buildSessionGraph';
import type { MultimodalAssetIndexingService } from './MultimodalAssetIndexingService';
import type { ClassifiedGroundTruthAsset, GroundTruthAssetKind } from './types';

type IndexableGroundTruthAssetKind =
  Exclude<GroundTruthAssetKind, 'session'>;

type IndexableGroundTruthAsset = ClassifiedGroundTruthAsset & {
  sourceKind: IndexableGroundTruthAssetKind;
};

const isIndexableGroundTruthAsset = (
  asset: ClassifiedGroundTruthAsset,
): asset is ClassifiedGroundTruthAsset & { kind: IndexableGroundTruthAssetKind } =>
  asset.kind !== 'session';

const isLecturePackJson = (asset: GroundTruthUploadAsset) => {
  if (!asset.name.toLowerCase().endsWith('.json')) {
    return false;
  }

  try {
    return LecturePackDtoSchema.safeParse(JSON.parse(asset.textContent ?? '')).success;
  } catch {
    return false;
  }
};

export class GroundTruthImporter implements GroundTruthImportService {
  constructor(
    private readonly lecturePackImportService: LecturePackImportService,
    private readonly pdfTextExtractor: GroundTruthPdfTextExtractor,
    private readonly pptxTextExtractor?: GroundTruthPptxTextExtractor,
    private readonly mergeSupport?: {
      lectureSessionRepository: LectureSessionRepository;
      sessionAppender: GroundTruthSessionAppender;
    },
    private readonly multimodalAssetIndexingService?: MultimodalAssetIndexingService,
  ) {}

  async importFromAssets(
    assets: GroundTruthUploadAsset[],
    sourceLabel: string,
    options?: GroundTruthImportOptions,
  ): Promise<LectureSession> {
    logDev(
      'ground-truth-import',
      'Importing grounded assets',
      assets.map((asset) => ({
        name: asset.name,
        mimeType: asset.mimeType,
        sourceUri: asset.sourceUri,
        hasTextContent: typeof asset.textContent === 'string',
      })),
    );

    try {
      if (assets.length === 1 && assets[0] && isLecturePackJson(assets[0])) {
        logDev('ground-truth-import', 'Detected direct lecture-pack JSON import', {
          sourceLabel,
          name: assets[0].name,
        });
        return this.lecturePackImportService.importFromJson(
          assets[0].textContent ?? '',
          assets[0].name,
        );
      }

      const fullPackAssets = assets.filter(isLecturePackJson);

      if (fullPackAssets.length > 0) {
        throw new Error(
          'A complete lecture-pack JSON was selected alongside raw grounded files. Import the lecture pack by itself, or remove it and upload the raw source files only.',
        );
      }

      const classifiedAssets = assets.map(classifyGroundTruthAsset);
      const indexableAssets: IndexableGroundTruthAsset[] = classifiedAssets
        .filter(isIndexableGroundTruthAsset)
        .map((asset) => ({
          ...asset,
          sourceKind: asset.kind,
        }));
      const normalizedAssets = await prepareGroundTruthAssets(
        assets,
        this.pdfTextExtractor,
        this.pptxTextExtractor,
      );
      logDev(
        'ground-truth-import',
        'Normalized grounded assets',
        normalizedAssets.map((asset) => ({
          name: asset.name,
          kind: asset.kind,
          extension: asset.extension,
          textLength: asset.textContent.length,
        })),
      );

      const mergeIntoSessionId = options?.mergeIntoSessionId ?? null;
      const existingSession =
        mergeIntoSessionId && this.mergeSupport
          ? await this.mergeSupport.lectureSessionRepository.findById(mergeIntoSessionId)
          : null;
      const lecturePack = buildGroundTruthLecturePack(normalizedAssets, sourceLabel, {
        existingSession: existingSession ?? undefined,
        idNamespaceSeed: existingSession
          ? `${existingSession.id}_${Date.now().toString(36)}`
          : undefined,
      });
      logDev('ground-truth-import', 'Built lecture pack from grounded assets', {
        sourceLabel,
        sessionId: lecturePack.session.id,
        sessionTitle: lecturePack.session.title,
        materialCount: lecturePack.materials.length,
        glossaryCount: lecturePack.glossary.length,
        transcriptCount: lecturePack.transcript.length,
        mergedIntoSessionId: existingSession?.id ?? null,
      });

      if (existingSession && this.mergeSupport) {
        const graph = buildSessionGraph(lecturePack, sourceLabel, nowIso());
        logDev('ground-truth-import', 'Appending grounded assets into active session', {
          sessionId: existingSession.id,
          materialCount: graph.materials.length,
          glossaryCount: graph.glossary.length,
          transcriptCount: graph.transcript.length,
        });
        const mergedSession = await this.mergeSupport.sessionAppender.appendToSession(
          graph,
          existingSession,
        );
        this.multimodalAssetIndexingService?.queueAssets(
          mergedSession.id,
          indexableAssets,
          normalizedAssets,
        );
        return mergedSession;
      }

      const importedSession = await this.lecturePackImportService.importFromJson(
        JSON.stringify(lecturePack, null, 2),
        sourceLabel,
      );
      this.multimodalAssetIndexingService?.queueAssets(
        importedSession.id,
        indexableAssets,
        normalizedAssets,
      );
      return importedSession;
    } catch (error) {
      logDev('ground-truth-import', 'Grounded asset import failed', serializeError(error));
      throw error;
    }
  }
}
