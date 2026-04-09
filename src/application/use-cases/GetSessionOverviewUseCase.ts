import { isGemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type { BookmarkRepository } from '@domain/repository-contracts/BookmarkRepository';
import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { LectureMaterialRepository } from '@domain/repository-contracts/LectureMaterialRepository';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { NoteRepository } from '@domain/repository-contracts/NoteRepository';
import type { QuestionRepository } from '@domain/repository-contracts/QuestionRepository';
import type { SummaryRepository } from '@domain/repository-contracts/SummaryRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type { SummarizationService } from '@domain/service-contracts/SummarizationService';
import type { SessionOverviewDto } from '@application/dto/SessionOverviewDto';

export class GetSessionOverviewUseCase {
  constructor(
    private readonly lectureSessionRepository: LectureSessionRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly lectureMaterialRepository: LectureMaterialRepository,
    private readonly materialChunkRepository: MaterialChunkRepository,
    private readonly glossaryTermRepository: GlossaryTermRepository,
    private readonly transcriptEntryRepository: TranscriptEntryRepository,
    private readonly questionRepository: QuestionRepository,
    private readonly noteRepository: NoteRepository,
    private readonly bookmarkRepository: BookmarkRepository,
    private readonly summarizationService: SummarizationService,
  ) {}

  async execute(sessionId: string): Promise<SessionOverviewDto | null> {
    const session = await this.lectureSessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }

    let summaries = await this.summaryRepository.listBySession(sessionId);
    if (!summaries.length) {
      try {
        summaries = await this.summarizationService.generateSessionSummaries(sessionId);
        await this.summaryRepository.saveMany(summaries);
      } catch (error) {
        if (!isGemmaRuntimeError(error)) {
          throw error;
        }
        summaries = [];
      }
    }

    const [materials, chunks, glossaryTerms, transcriptEntries, publicQuestions, notes, bookmarks] =
      await Promise.all([
        this.lectureMaterialRepository.listBySession(sessionId),
        this.materialChunkRepository.listBySession(sessionId),
        this.glossaryTermRepository.listBySession(sessionId),
        this.transcriptEntryRepository.listBySession(sessionId),
        this.questionRepository.listPublicBySession(sessionId),
        this.noteRepository.listBySession(sessionId),
        this.bookmarkRepository.listBySession(sessionId),
      ]);

    return {
      session,
      summaries,
      counts: {
        materialCount: materials.length,
        chunkCount: chunks.length,
        glossaryTermCount: glossaryTerms.length,
        transcriptEntryCount: transcriptEntries.length,
        publicQuestionCount: publicQuestions.length,
        noteCount: notes.length,
        bookmarkCount: bookmarks.length,
      },
      transcriptEntries,
      latestTranscriptEntries: transcriptEntries.slice(-4),
    };
  }
}
