import type { AssetDigestRepository } from '@domain/repository-contracts/AssetDigestRepository';
import type { EvidenceUnit } from '@domain/entities/EvidenceUnit';
import type { EvidenceUnitRepository } from '@domain/repository-contracts/EvidenceUnitRepository';
import type { GlossaryTerm } from '@domain/entities/GlossaryTerm';
import type { MaterialChunk } from '@domain/entities/MaterialChunk';
import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';
import type { GlossaryTermRepository } from '@domain/repository-contracts/GlossaryTermRepository';
import type { MaterialChunkRepository } from '@domain/repository-contracts/MaterialChunkRepository';
import type { TranscriptEntryRepository } from '@domain/repository-contracts/TranscriptEntryRepository';
import type { UploadedAssetRepository } from '@domain/repository-contracts/UploadedAssetRepository';
import type { RetrievalMatch } from '@domain/service-contracts/RetrievalService';
import {
  candidateContainsQuestionFocus,
  computeQuestionFocusBoost,
  computeTextMatchScore,
} from '@infrastructure/retrieval-engine/scoring';

export interface GroundedVisualEvidence {
  uri: string;
  caption: string;
  sourceRecordId: string;
}

const ANSWER_CONTEXT_LIMITS =
  process.env.NODE_ENV === 'production'
    ? ({
        focusedEvidenceCount: 6,
        focusedVisualCount: 1,
        glossaryDigestBlocks: 2,
        materialDigestBlocks: 3,
        transcriptDigestBlocks: 2,
        glossaryBlockChars: 800,
        materialBlockChars: 1000,
        transcriptBlockChars: 850,
      } as const)
    : ({
        focusedEvidenceCount: 8,
        focusedVisualCount: 1,
        glossaryDigestBlocks: 3,
        materialDigestBlocks: 4,
        transcriptDigestBlocks: 2,
        glossaryBlockChars: 900,
        materialBlockChars: 1150,
        transcriptBlockChars: 900,
      } as const);

interface ContextLine {
  score: number;
  text: string;
}

const sourceKey = (sourceType: RetrievalMatch['sourceType'], sourceRecordId: string) =>
  `${sourceType}:${sourceRecordId}`;

const pushChunkedLines = (
  entries: string[],
  destination: string[],
  title: string,
  maxChars: number,
  maxBlocks: number,
) => {
  if (!entries.length || maxBlocks <= 0) {
    return;
  }

  const chunks: string[] = [];
  let currentChunk = `${title}\n`;

  for (const entry of entries) {
    const candidate = `${currentChunk}${entry}\n`;
    if (candidate.length > maxChars && currentChunk.trim() !== title) {
      chunks.push(currentChunk.trim());
      currentChunk = `${title}\n${entry}\n`;
    } else {
      currentChunk = candidate;
    }
  }

  if (currentChunk.trim() !== title) {
    chunks.push(currentChunk.trim());
  }

  destination.push(...chunks.slice(0, maxBlocks));
};

const scoreContextLine = (questionText: string, text: string, baseBoost: number) =>
  computeTextMatchScore(questionText, text, baseBoost + computeQuestionFocusBoost(questionText, text));

const formatGlossaryLine = (term: GlossaryTerm) =>
  `- ${term.term}: ${term.definition}${
    term.aliases.length ? ` Aliases: ${term.aliases.join(', ')}.` : ''
  }`;

const formatMaterialLine = (chunk: MaterialChunk) =>
  `- ${chunk.heading}: ${chunk.text}${
    chunk.keywords.length ? ` Keywords: ${chunk.keywords.join(', ')}.` : ''
  }`;

const formatTranscriptLine = (entry: TranscriptEntry) =>
  `- ${entry.speakerLabel} at ${Math.round(entry.startedAtSeconds)}s: ${entry.text}`;

const formatEvidenceUnitLine = (unit: EvidenceUnit, assetFileName?: string | null) => {
  const location =
    unit.pageNumber !== null
      ? ` Page ${unit.pageNumber}.`
      : unit.slideNumber !== null
        ? ` Slide ${unit.slideNumber}.`
        : unit.timestampStartSeconds !== null
          ? ` Timestamp ${Math.round(unit.timestampStartSeconds)}s${unit.timestampEndSeconds !== null ? `-${Math.round(unit.timestampEndSeconds)}s` : ''}.`
          : '';

  return `- ${unit.title}: ${unit.contentText}${assetFileName ? ` Source file: ${assetFileName}.` : ''}${location}`;
};

const formatEvidenceUnitVisualCaption = (unit: EvidenceUnit, assetFileName?: string | null) => {
  const parts = [unit.title];

  if (assetFileName) {
    parts.push(`File: ${assetFileName}.`);
  }

  if (unit.pageNumber !== null) {
    parts.push(`Page ${unit.pageNumber}.`);
  } else if (unit.slideNumber !== null) {
    parts.push(`Slide ${unit.slideNumber}.`);
  }

  if (unit.frameLabel) {
    parts.push(`${unit.frameLabel}.`);
  }

  if (unit.timestampStartSeconds !== null) {
    parts.push(
      unit.timestampEndSeconds !== null
        ? `Timestamp ${Math.round(unit.timestampStartSeconds)}s-${Math.round(unit.timestampEndSeconds)}s.`
        : `Timestamp ${Math.round(unit.timestampStartSeconds)}s.`,
    );
  }

  parts.push(unit.excerpt);
  return parts.join(' ');
};

export class SessionGroundedContextBuilder {
  constructor(
    private readonly glossaryRepository: GlossaryTermRepository,
    private readonly materialChunkRepository: MaterialChunkRepository,
    private readonly transcriptRepository: TranscriptEntryRepository,
    private readonly evidenceUnitRepository?: EvidenceUnitRepository,
    private readonly assetDigestRepository?: AssetDigestRepository,
    private readonly uploadedAssetRepository?: UploadedAssetRepository,
  ) {}

  async buildAnswerEvidence(
    sessionId: string,
    questionText: string,
    retrievalMatches: RetrievalMatch[],
  ): Promise<string[]> {
    const [glossaryTerms, materialChunks, transcriptEntries] = await Promise.all([
      this.glossaryRepository.listBySession(sessionId),
      this.materialChunkRepository.listBySession(sessionId),
      this.transcriptRepository.listBySession(sessionId),
    ]);
    const [evidenceUnits, assetDigests, uploadedAssets] = await Promise.all([
      this.evidenceUnitRepository?.listBySession(sessionId) ?? Promise.resolve([]),
      this.assetDigestRepository?.listBySession(sessionId) ?? Promise.resolve([]),
      this.uploadedAssetRepository?.listBySession(sessionId) ?? Promise.resolve([]),
    ]);

    const glossaryMap = new Map(glossaryTerms.map((term) => [term.id, term]));
    const materialMap = new Map(materialChunks.map((chunk) => [chunk.id, chunk]));
    const transcriptMap = new Map(transcriptEntries.map((entry) => [entry.id, entry]));
    const evidenceUnitMap = new Map(evidenceUnits.map((unit) => [unit.id, unit]));
    const assetFileNameById = new Map(uploadedAssets.map((asset) => [asset.id, asset.fileName]));

    const focusedEvidence = retrievalMatches
      .slice(0, ANSWER_CONTEXT_LIMITS.focusedEvidenceCount)
      .map((match) => {
        if (match.sourceType === 'glossary_term') {
          const term = glossaryMap.get(match.sourceRecordId);
          if (term) {
            return `Focused glossary evidence\n${formatGlossaryLine(term)}`;
          }
        }

        if (match.sourceType === 'material_chunk') {
          const chunk = materialMap.get(match.sourceRecordId);
          if (chunk) {
            return `Focused lecture material\n${formatMaterialLine(chunk)}`;
          }
        }

        if (match.sourceType === 'transcript_entry') {
          const entry = transcriptMap.get(match.sourceRecordId);
          if (entry) {
            return `Focused transcript evidence\n${formatTranscriptLine(entry)}`;
          }
        }

        if (match.sourceType === 'evidence_unit') {
          const unit = evidenceUnitMap.get(match.sourceRecordId);
          if (unit) {
            return `Focused multimodal evidence\n${formatEvidenceUnitLine(
              unit,
              assetFileNameById.get(unit.assetId),
            )}`;
          }
        }

        return `Focused evidence\n- ${match.label}: ${match.excerpt}`;
      });

    const focusedKeys = new Set(retrievalMatches.map((match) => sourceKey(match.sourceType, match.sourceRecordId)));
    const evidence: string[] = [...focusedEvidence];
    const focusedEvidenceUnitAssetIds = new Set(
      retrievalMatches
        .filter((match) => match.sourceType === 'evidence_unit')
        .map((match) => evidenceUnitMap.get(match.sourceRecordId)?.assetId)
        .filter((value): value is string => typeof value === 'string'),
    );

    const glossaryLines: ContextLine[] = glossaryTerms
      .filter((term) => !focusedKeys.has(sourceKey('glossary_term', term.id)))
      .map((term) => {
        const text = formatGlossaryLine(term);
        return {
          text,
          score: scoreContextLine(questionText, `${term.term} ${term.definition}`, 0.4),
        };
      })
      .sort((left, right) => right.score - left.score || left.text.localeCompare(right.text));

    const materialLines: ContextLine[] = materialChunks
      .filter((chunk) => !focusedKeys.has(sourceKey('material_chunk', chunk.id)))
      .map((chunk) => {
        const text = formatMaterialLine(chunk);
        return {
          text,
          score: scoreContextLine(questionText, `${chunk.heading} ${chunk.text}`, 0.2),
        };
      })
      .sort((left, right) => right.score - left.score || left.text.localeCompare(right.text));

    const transcriptLines: ContextLine[] = transcriptEntries
      .filter((entry) => !focusedKeys.has(sourceKey('transcript_entry', entry.id)))
      .map((entry) => {
        const text = formatTranscriptLine(entry);
        return {
          text,
          score: scoreContextLine(questionText, `${entry.speakerLabel} ${entry.text}`, 0.05),
        };
      })
      .sort((left, right) => right.score - left.score || left.text.localeCompare(right.text));

    const evidenceUnitLines: ContextLine[] = evidenceUnits
      .filter((unit) => !focusedKeys.has(sourceKey('evidence_unit', unit.id)))
      .map((unit) => {
        const text = formatEvidenceUnitLine(unit, assetFileNameById.get(unit.assetId));
        return {
          text,
          score: scoreContextLine(questionText, `${unit.title} ${unit.searchText}`, 0.35),
        };
      })
      .sort((left, right) => right.score - left.score || left.text.localeCompare(right.text));

    const relevantAssetDigests = assetDigests
      .filter(
        (digest) =>
          digest.kind === 'asset_summary' &&
          digest.assetId !== null &&
          (focusedEvidenceUnitAssetIds.has(digest.assetId) ||
            candidateContainsQuestionFocus(questionText, `${digest.title} ${digest.text}`)),
      )
      .slice(0, 4)
      .map((digest) => `Asset digest\n- ${digest.title}: ${digest.text}`);
    const sessionDigest = assetDigests.find((digest) => digest.kind === 'session_summary');

    pushChunkedLines(
      evidenceUnitLines.map((line) => line.text),
      evidence,
      candidateContainsQuestionFocus(
        questionText,
        evidenceUnitLines.map((line) => line.text).join(' '),
      )
        ? 'Session indexed multimodal context (high relevance)'
        : 'Session indexed multimodal context',
      ANSWER_CONTEXT_LIMITS.materialBlockChars,
      ANSWER_CONTEXT_LIMITS.materialDigestBlocks,
    );
    pushChunkedLines(
      glossaryLines.map((line) => line.text),
      evidence,
      candidateContainsQuestionFocus(
        questionText,
        glossaryLines.map((line) => line.text).join(' '),
      )
        ? 'Session glossary context (high relevance)'
        : 'Session glossary context',
      ANSWER_CONTEXT_LIMITS.glossaryBlockChars,
      ANSWER_CONTEXT_LIMITS.glossaryDigestBlocks,
    );
    pushChunkedLines(
      materialLines.map((line) => line.text),
      evidence,
      candidateContainsQuestionFocus(
        questionText,
        materialLines.map((line) => line.text).join(' '),
      )
        ? 'Session lecture material context (high relevance)'
        : 'Session lecture material context',
      ANSWER_CONTEXT_LIMITS.materialBlockChars,
      ANSWER_CONTEXT_LIMITS.materialDigestBlocks,
    );
    pushChunkedLines(
      transcriptLines.map((line) => line.text),
      evidence,
      candidateContainsQuestionFocus(
        questionText,
        transcriptLines.map((line) => line.text).join(' '),
      )
        ? 'Session transcript context (high relevance)'
        : 'Session transcript context',
      ANSWER_CONTEXT_LIMITS.transcriptBlockChars,
      ANSWER_CONTEXT_LIMITS.transcriptDigestBlocks,
    );

    evidence.push(...relevantAssetDigests);
    if (sessionDigest) {
      evidence.push(`Session digest\n${sessionDigest.text}`);
    }

    return evidence;
  }

  async buildAnswerVisualEvidence(
    sessionId: string,
    questionText: string,
    retrievalMatches: RetrievalMatch[],
  ): Promise<GroundedVisualEvidence[]> {
    if (!this.evidenceUnitRepository || !this.uploadedAssetRepository) {
      return [];
    }

    const [evidenceUnits, uploadedAssets] = await Promise.all([
      this.evidenceUnitRepository.listBySession(sessionId),
      this.uploadedAssetRepository.listBySession(sessionId),
    ]);
    const evidenceUnitMap = new Map(evidenceUnits.map((unit) => [unit.id, unit]));
    const assetFileNameById = new Map(uploadedAssets.map((asset) => [asset.id, asset.fileName]));
    const visuals: GroundedVisualEvidence[] = [];
    const seen = new Set<string>();

    const maybePushVisual = (unit: EvidenceUnit | undefined) => {
      if (!unit?.previewUri || seen.has(unit.id)) {
        return;
      }

      seen.add(unit.id);
      visuals.push({
        uri: unit.previewUri,
        caption: formatEvidenceUnitVisualCaption(unit, assetFileNameById.get(unit.assetId)),
        sourceRecordId: unit.id,
      });
    };

    retrievalMatches
      .filter((match) => match.sourceType === 'evidence_unit')
      .forEach((match) => {
        maybePushVisual(evidenceUnitMap.get(match.sourceRecordId));
      });

    if (visuals.length >= ANSWER_CONTEXT_LIMITS.focusedVisualCount) {
      return visuals.slice(0, ANSWER_CONTEXT_LIMITS.focusedVisualCount);
    }

    const fallbackVisuals = evidenceUnits
      .filter((unit) => unit.previewUri)
      .map((unit) => ({
        unit,
        score: scoreContextLine(questionText, `${unit.title} ${unit.searchText}`, 0.3),
      }))
      .filter(
        ({ unit, score }) =>
          !seen.has(unit.id) &&
          (score >= 0.6 ||
            candidateContainsQuestionFocus(questionText, `${unit.title} ${unit.contentText}`)),
      )
      .sort((left, right) => right.score - left.score || left.unit.title.localeCompare(right.unit.title));

    for (const { unit } of fallbackVisuals) {
      maybePushVisual(unit);
      if (visuals.length >= ANSWER_CONTEXT_LIMITS.focusedVisualCount) {
        break;
      }
    }

    return visuals;
  }
}
