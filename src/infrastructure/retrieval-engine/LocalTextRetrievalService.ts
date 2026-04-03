import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type {
  RetrievalMatch,
  RetrievalResult,
  RetrievalService,
} from '@domain/service-contracts/RetrievalService';
import { sortMatchesByPriority } from '@domain/business-rules/GroundedAnswerPolicy';
import { appConfig } from '@shared/config/appConfig';
import { toExcerpt } from '@shared/utils/text';
import {
  computeTextMatchScore,
  questionContainsTerm,
} from '@infrastructure/retrieval-engine/scoring';

export class LocalTextRetrievalService implements RetrievalService {
  constructor(
    private readonly glossaryRepository: GlossaryTermRepository,
    private readonly materialChunkRepository: MaterialChunkRepository,
    private readonly transcriptRepository: TranscriptEntryRepository,
  ) {}

  async retrieve(sessionId: string, questionText: string): Promise<RetrievalResult> {
    const [glossaryTerms, materialChunks, transcriptEntries] = await Promise.all([
      this.glossaryRepository.listBySession(sessionId),
      this.materialChunkRepository.listBySession(sessionId),
      this.transcriptRepository.listBySession(sessionId),
    ]);

    const glossaryMatches: RetrievalMatch[] = glossaryTerms
      .map((term) => {
        const exactMatch = questionContainsTerm(questionText, [term.term, ...term.aliases]);
        const score = computeTextMatchScore(
          questionText,
          `${term.term} ${term.aliases.join(' ')} ${term.definition}`,
          exactMatch ? 1.4 : 0.75,
        );

        return {
          sourceType: 'glossary_term' as const,
          sourceRecordId: term.id,
          label: `Glossary: ${term.term}`,
          excerpt: term.definition,
          score,
        };
      })
      .filter((match) => match.score >= 0.8);

    const materialMatches: RetrievalMatch[] = materialChunks
      .map((chunk) => ({
        sourceType: 'material_chunk' as const,
        sourceRecordId: chunk.id,
        label: `Material: ${chunk.heading}`,
        excerpt: toExcerpt(chunk.text, 220),
        score: computeTextMatchScore(
          questionText,
          `${chunk.heading} ${chunk.keywords.join(' ')} ${chunk.text}`,
          0.4,
        ),
      }))
      .filter((match) => match.score >= 0.65);

    const transcriptMatches: RetrievalMatch[] = transcriptEntries
      .map((entry) => ({
        sourceType: 'transcript_entry' as const,
        sourceRecordId: entry.id,
        label: `Transcript: ${entry.speakerLabel}`,
        excerpt: toExcerpt(entry.text, 200),
        score: computeTextMatchScore(questionText, `${entry.speakerLabel} ${entry.text}`, 0.1),
      }))
      .filter((match) => match.score >= 0.55);

    return {
      matches: sortMatchesByPriority([
        ...glossaryMatches,
        ...materialMatches,
        ...transcriptMatches,
      ]).slice(0, appConfig.retrieval.maxSources),
    };
  }
}
