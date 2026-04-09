import type { Summary } from '@domain/entities/Summary';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import { isGemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { LLMService } from '@domain/service-contracts/LLMService';
import type { SummarizationService } from '@domain/service-contracts/SummarizationService';
import {
  buildExamFocusSummary,
  buildFallbackOverview,
  buildKeyPointsSummary,
  buildSummaryEvidence,
} from '@infrastructure/gemma-runtime/localSummaryFallback';
import { limitSummaryText } from '@infrastructure/gemma-runtime/prompting';
import { nowIso } from '@shared/utils/dates';
import { createEntityId } from '@shared/utils/ids';

export class LocalGemmaSummarizationService implements SummarizationService {
  constructor(
    private readonly materialChunkRepository: MaterialChunkRepository,
    private readonly transcriptRepository: TranscriptEntryRepository,
    private readonly llmService: LLMService,
  ) {}

  async generateSessionSummaries(sessionId: string): Promise<Summary[]> {
    const [chunks, transcriptEntries] = await Promise.all([
      this.materialChunkRepository.listBySession(sessionId),
      this.transcriptRepository.listBySession(sessionId),
    ]);

    const createdAt = nowIso();
    const evidence = buildSummaryEvidence(chunks, transcriptEntries);
    let overviewText = '';

    try {
      overviewText = limitSummaryText(
        await this.llmService.generateText({
          mode: 'summary',
          instruction: 'Summarize the lecture session using only the local evidence.',
          evidence,
        }),
      );
    } catch (error) {
      if (!isGemmaRuntimeError(error)) {
        throw error;
      }
    }

    overviewText ||= buildFallbackOverview(chunks, transcriptEntries);
    const keyPointsText = buildKeyPointsSummary(chunks, transcriptEntries);
    const examFocusText = buildExamFocusSummary(chunks);

    return [
      {
        id: createEntityId('summary'),
        sessionId,
        kind: 'overview',
        title: 'Session overview',
        text:
          overviewText ||
          'This session does not include enough imported lecture evidence to generate a local summary yet.',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: createEntityId('summary'),
        sessionId,
        kind: 'key_points',
        title: 'Key points',
        text: keyPointsText,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: createEntityId('summary'),
        sessionId,
        kind: 'exam_focus',
        title: 'Exam focus',
        text: examFocusText,
        createdAt,
        updatedAt: createdAt,
      },
    ];
  }
}
