import type { Summary } from '@domain/entities/Summary';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type { LLMService } from '@domain/service-contracts/LLMService';
import type { SummarizationService } from '@domain/service-contracts/SummarizationService';
import { nowIso } from '@shared/utils/dates';
import { createEntityId } from '@shared/utils/ids';

export class MockSummarizationService implements SummarizationService {
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
    const evidence = [
      ...chunks.slice(0, 3).map((chunk) => `${chunk.heading}: ${chunk.text}`),
      ...transcriptEntries.slice(0, 2).map((entry) => `${entry.speakerLabel}: ${entry.text}`),
    ];

    const overviewText =
      (await this.llmService.generateText({
        mode: 'summary',
        instruction: 'Summarize the lecture session using only the local evidence.',
        evidence,
      })) || 'No summary could be generated from the available lecture data.';

    const keyPointsText =
      chunks
        .slice(0, 3)
        .map((chunk) => chunk.heading)
        .join(' | ') || 'No material chunks are available yet.';

    return [
      {
        id: createEntityId('summary'),
        sessionId,
        kind: 'overview',
        title: 'Session overview',
        text: overviewText,
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
        text: 'Prioritize glossary definitions, source-priority rules, grounded-answer constraints, and the unsupported-question behavior.',
        createdAt,
        updatedAt: createdAt,
      },
    ];
  }
}
