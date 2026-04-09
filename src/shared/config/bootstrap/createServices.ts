import { DesktopMultimodalBridgeClient } from '@infrastructure/gemma-runtime/DesktopMultimodalBridgeClient';
import { GroundTruthImporter } from '@infrastructure/ground-truth-import/GroundTruthImporter';
import { DrizzleGroundTruthSessionAppender } from '@infrastructure/ground-truth-import/GroundTruthSessionAppender';
import { MultimodalAssetIndexingService } from '@infrastructure/ground-truth-import/MultimodalAssetIndexingService';
import { NativePdfTextExtractor } from '@infrastructure/ground-truth-import/PdfTextExtractor';
import { NativePptxTextExtractor } from '@infrastructure/ground-truth-import/PptxTextExtractor';
import type { AppDatabase } from '@infrastructure/database/client';
import { LecturePackImporter } from '@infrastructure/lecture-pack/LecturePackImporter';
import { createGemmaAdapter } from '@infrastructure/gemma-runtime/createGemmaAdapter';
import { LocalGemmaSummarizationService } from '@infrastructure/gemma-runtime/LocalGemmaSummarizationService';
import { LocalGroundedQuestionAnsweringService } from '@infrastructure/gemma-runtime/LocalGroundedQuestionAnsweringService';
import { SessionGroundedContextBuilder } from '@infrastructure/gemma-runtime/SessionGroundedContextBuilder';
import { LocalSupportCheckService } from '@infrastructure/mock-llm-services/LocalSupportCheckService';
import { MockCategorizationService } from '@infrastructure/mock-llm-services/MockCategorizationService';
import { MockLLMService } from '@infrastructure/mock-llm-services/MockLLMService';
import { LocalTextRetrievalService } from '@infrastructure/retrieval-engine/LocalTextRetrievalService';
import { modelConfig } from '@shared/config/modelConfig';
import { resolveLLMService } from '@/app-shell/bootstrap/resolveLLMService';
import type { AppRepositories, AppServices } from '@/app-shell/bootstrap/types';

export const createServices = (
  database: AppDatabase,
  repositories: AppRepositories,
): AppServices => {
  const gemmaAdapter = createGemmaAdapter(modelConfig.primary);
  const llmService = resolveLLMService(gemmaAdapter, new MockLLMService());
  const lecturePackImportService = new LecturePackImporter(database);
  const desktopMultimodalBridgeClient = __DEV__
    ? new DesktopMultimodalBridgeClient(modelConfig.desktopDemo)
    : null;
  const multimodalAssetIndexingService = new MultimodalAssetIndexingService(
    repositories.uploadedAssetRepository,
    repositories.evidenceUnitRepository,
    repositories.assetDigestRepository,
    desktopMultimodalBridgeClient,
  );

  return {
    lecturePackImportService,
    groundTruthImportService: new GroundTruthImporter(
      lecturePackImportService,
      new NativePdfTextExtractor(),
      new NativePptxTextExtractor(),
      {
        lectureSessionRepository: repositories.lectureSessionRepository,
        sessionAppender: new DrizzleGroundTruthSessionAppender(database),
      },
      multimodalAssetIndexingService,
    ),
    llmService,
    gemmaAdapter,
    retrievalService: new LocalTextRetrievalService(
      repositories.glossaryTermRepository,
      repositories.materialChunkRepository,
      repositories.transcriptEntryRepository,
      repositories.evidenceUnitRepository,
      desktopMultimodalBridgeClient,
    ),
    summarizationService: new LocalGemmaSummarizationService(
      repositories.materialChunkRepository,
      repositories.transcriptEntryRepository,
      llmService,
    ),
    categorizationService: new MockCategorizationService(),
    supportCheckService: new LocalSupportCheckService(),
    questionAnsweringService: new LocalGroundedQuestionAnsweringService(
      llmService,
      new SessionGroundedContextBuilder(
        repositories.glossaryTermRepository,
        repositories.materialChunkRepository,
        repositories.transcriptEntryRepository,
        repositories.evidenceUnitRepository,
        repositories.assetDigestRepository,
        repositories.uploadedAssetRepository,
      ),
    ),
  };
};
