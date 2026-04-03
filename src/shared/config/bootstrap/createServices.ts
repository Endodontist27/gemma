import { resolveLLMService } from '@app/bootstrap/resolveLLMService';
import type { AppRepositories, AppServices } from '@app/bootstrap/types';
import type { AppDatabase } from '@infrastructure/database/client';
import { LecturePackImporter } from '@infrastructure/lecture-pack/LecturePackImporter';
import { GemmaLocalAdapter } from '@infrastructure/mock-llm-services/GemmaLocalAdapter';
import { LocalSupportCheckService } from '@infrastructure/mock-llm-services/LocalSupportCheckService';
import { MockCategorizationService } from '@infrastructure/mock-llm-services/MockCategorizationService';
import { MockGroundedQuestionAnsweringService } from '@infrastructure/mock-llm-services/MockGroundedQuestionAnsweringService';
import { MockLLMService } from '@infrastructure/mock-llm-services/MockLLMService';
import { MockSummarizationService } from '@infrastructure/mock-llm-services/MockSummarizationService';
import { LocalTextRetrievalService } from '@infrastructure/retrieval-engine/LocalTextRetrievalService';
import { modelConfig } from '@shared/config/modelConfig';

export const createServices = (
  database: AppDatabase,
  repositories: AppRepositories,
): AppServices => {
  const gemmaAdapter = new GemmaLocalAdapter(modelConfig.primary);
  const llmService = resolveLLMService(gemmaAdapter, new MockLLMService());

  return {
    lecturePackImportService: new LecturePackImporter(database),
    llmService,
    gemmaAdapter,
    retrievalService: new LocalTextRetrievalService(
      repositories.glossaryTermRepository,
      repositories.materialChunkRepository,
      repositories.transcriptEntryRepository,
    ),
    summarizationService: new MockSummarizationService(
      repositories.materialChunkRepository,
      repositories.transcriptEntryRepository,
      llmService,
    ),
    categorizationService: new MockCategorizationService(),
    supportCheckService: new LocalSupportCheckService(),
    questionAnsweringService: new MockGroundedQuestionAnsweringService(llmService),
  };
};
