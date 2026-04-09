import type {
  EvidenceUnitRepository,
  EvidenceUnitSearchResult,
} from '@domain/repository-contracts/EvidenceUnitRepository';
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
  candidateContainsQuestionFocus,
  computeQuestionFocusBoost,
  computeTextMatchScore,
  isDefinitionStyleQuestion,
  questionContainsTerm,
} from '@infrastructure/retrieval-engine/scoring';
import type {
  DesktopBridgeRerankCandidate,
  DesktopMultimodalBridgeClient,
} from '@infrastructure/gemma-runtime/DesktopMultimodalBridgeClient';

export class LocalTextRetrievalService implements RetrievalService {
  constructor(
    private readonly glossaryRepository: GlossaryTermRepository,
    private readonly materialChunkRepository: MaterialChunkRepository,
    private readonly transcriptRepository: TranscriptEntryRepository,
    private readonly evidenceUnitRepository?: EvidenceUnitRepository,
    private readonly desktopMultimodalBridgeClient?: DesktopMultimodalBridgeClient | null,
  ) {}

  async retrieve(sessionId: string, questionText: string): Promise<RetrievalResult> {
    const [glossaryTerms, materialChunks, transcriptEntries] = await Promise.all([
      this.glossaryRepository.listBySession(sessionId),
      this.materialChunkRepository.listBySession(sessionId),
      this.transcriptRepository.listBySession(sessionId),
    ]);
    const evidenceUnitMatches =
      this.evidenceUnitRepository
        ? await this.evidenceUnitRepository.search(
            sessionId,
            questionText,
            appConfig.retrieval.maxSources,
          )
        : [];

    const requiresFocusedPhraseMatch = isDefinitionStyleQuestion(questionText);

    const rerankedEvidenceMatches = evidenceUnitMatches.length
      ? await this.rerankEvidenceUnits(questionText, evidenceUnitMatches)
      : [];

    const glossaryMatches: RetrievalMatch[] = glossaryTerms
      .map((term) => {
        const exactMatch = questionContainsTerm(questionText, [term.term, ...term.aliases]);
        const candidateText = `${term.term} ${term.aliases.join(' ')} ${term.definition}`;
        const containsQuestionFocus = candidateContainsQuestionFocus(questionText, candidateText);
        const score = computeTextMatchScore(
          questionText,
          candidateText,
          (exactMatch ? 1.4 : 0.75) +
            computeQuestionFocusBoost(questionText, `${term.term} ${term.definition}`),
        );

        return {
          sourceType: 'glossary_term' as const,
          sourceRecordId: term.id,
          label: `Glossary: ${term.term}`,
          excerpt: term.definition,
          score,
          exactMatch,
          containsQuestionFocus,
        };
      })
      .filter(
        (match) =>
          match.score >= 0.8 &&
          (!requiresFocusedPhraseMatch || match.exactMatch || match.containsQuestionFocus),
      )
      .map(({ exactMatch: _exactMatch, containsQuestionFocus: _containsQuestionFocus, ...match }) => match);

    const materialMatches: RetrievalMatch[] = materialChunks
      .map((chunk) => {
        const candidateText = `${chunk.heading} ${chunk.keywords.join(' ')} ${chunk.text}`;
        return {
          sourceType: 'material_chunk' as const,
          sourceRecordId: chunk.id,
          label: `Material: ${chunk.heading}`,
          excerpt: toExcerpt(chunk.text, 420),
          score: computeTextMatchScore(
            questionText,
            candidateText,
            0.4 + computeQuestionFocusBoost(questionText, `${chunk.heading} ${chunk.text}`),
          ),
          containsQuestionFocus: candidateContainsQuestionFocus(questionText, candidateText),
        };
      })
      .filter(
        (match) =>
          match.score >= 0.65 &&
          (!requiresFocusedPhraseMatch || match.containsQuestionFocus),
      )
      .map(({ containsQuestionFocus: _containsQuestionFocus, ...match }) => match);

    const transcriptMatches: RetrievalMatch[] = transcriptEntries
      .map((entry) => {
        const candidateText = `${entry.speakerLabel} ${entry.text}`;
        return {
          sourceType: 'transcript_entry' as const,
          sourceRecordId: entry.id,
          label: `Transcript: ${entry.speakerLabel}`,
          excerpt: toExcerpt(entry.text, 360),
          score: computeTextMatchScore(questionText, candidateText, 0.1),
          containsQuestionFocus: candidateContainsQuestionFocus(questionText, candidateText),
        };
      })
      .filter(
        (match) =>
          match.score >= 0.55 &&
          (!requiresFocusedPhraseMatch || match.containsQuestionFocus),
      )
      .map(({ containsQuestionFocus: _containsQuestionFocus, ...match }) => match);

    return {
      matches: sortMatchesByPriority([
        ...rerankedEvidenceMatches,
        ...glossaryMatches,
        ...materialMatches,
        ...transcriptMatches,
      ]).slice(0, appConfig.retrieval.maxSources),
    };
  }

  private async rerankEvidenceUnits(
    questionText: string,
    evidenceUnitMatches: EvidenceUnitSearchResult[],
  ): Promise<RetrievalMatch[]> {
    const baselineMatches: RetrievalMatch[] = evidenceUnitMatches.map(({ unit, rank }) => {
      const candidateText = `${unit.title} ${unit.contentText}`;
      const isVisualModality = unit.modality === 'image' || unit.modality === 'video' || unit.modality === 'slide' || unit.modality === 'pdf';

      return {
        sourceType: 'evidence_unit',
        sourceRecordId: unit.id,
        label: unit.title,
        excerpt: unit.excerpt,
        score:
          Math.max(1, 4 / Math.max(rank, 0.25)) +
          computeQuestionFocusBoost(questionText, candidateText) +
          (isVisualModality && candidateContainsQuestionFocus(questionText, candidateText) ? 0.35 : 0),
      };
    });

    if (!this.desktopMultimodalBridgeClient) {
      return baselineMatches;
    }

    const reranked = await this.desktopMultimodalBridgeClient.rerank(
      questionText,
      evidenceUnitMatches.map<DesktopBridgeRerankCandidate>(({ unit }) => ({
        id: unit.id,
        title: unit.title,
        excerpt: unit.contentText,
      })),
    );

    if (!reranked?.length) {
      return baselineMatches;
    }

    const rerankScoreById = new Map(reranked.map((item) => [item.id, item.score]));
    return baselineMatches
      .map((match) => ({
        ...match,
        score: rerankScoreById.get(match.sourceRecordId) ?? match.score,
      }))
      .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  }
}
