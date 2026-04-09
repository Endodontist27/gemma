import type {
  GroundTruthImportOptions,
  GroundTruthImportService,
} from '@domain/service-contracts/GroundTruthImportService';
import type { GroundTruthUploadAsset } from '@shared/types/GroundTruthUploadAsset';

export class ImportGroundTruthAssetsUseCase {
  constructor(private readonly groundTruthImportService: GroundTruthImportService) {}

  async execute(
    assets: GroundTruthUploadAsset[],
    sourceLabel: string,
    options?: GroundTruthImportOptions,
  ) {
    return this.groundTruthImportService.importFromAssets(assets, sourceLabel, options);
  }
}
