import type { QACategory } from '@domain/entities/QACategory';
import {
  buildUnsupportedAnswer,
  sortMatchesByPriority,
} from '@domain/business-rules/GroundedAnswerPolicy';
import type { LLMService } from '@domain/service-contracts/LLMService';
import { GemmaRuntimeError } from '@domain/service-contracts/GemmaRuntimeError';
import type {
  GroundedAnswerDraft,
  QuestionAnsweringService,
} from '@domain/service-contracts/QuestionAnsweringService';
import type { RetrievalResult } from '@domain/service-contracts/RetrievalService';
import {
  isUnsupportedGroundedAnswerText,
  limitAnswerText,
  sanitizeGroundedAnswerText,
} from '@infrastructure/gemma-runtime/prompting';
import {
  candidateContainsQuestionFocus,
  extractQuestionFocus,
} from '@infrastructure/retrieval-engine/scoring';
import { SessionGroundedContextBuilder } from '@infrastructure/gemma-runtime/SessionGroundedContextBuilder';
import { appConfig } from '@shared/config/appConfig';
import { logDev } from '@shared/utils/debug';

const stripTrailingPunctuation = (value: string) => value.replace(/[.?!]+$/g, '').trim();

const ensureSentence = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const parseGlossaryLabelTerm = (label: string) =>
  label.startsWith('Glossary: ') ? label.slice('Glossary: '.length).trim() : null;

const buildDeterministicDefinitionAnswer = (
  questionText: string,
  prioritizedMatches: RetrievalResult['matches'],
) => {
  const focus = extractQuestionFocus(questionText);
  if (!focus) {
    return null;
  }

  const normalizedFocus = stripTrailingPunctuation(focus.toLowerCase());
  const glossaryDefinition = prioritizedMatches.find((match) => {
    if (match.sourceType !== 'glossary_term') {
      return false;
    }

    const glossaryTerm = parseGlossaryLabelTerm(match.label);
    return glossaryTerm
      ? stripTrailingPunctuation(glossaryTerm.toLowerCase()) === normalizedFocus
      : false;
  });

  if (glossaryDefinition) {
    return ensureSentence(glossaryDefinition.excerpt);
  }

  const materialDefinition = prioritizedMatches.find((match) =>
    `${match.label} ${match.excerpt}`.toLowerCase().includes(normalizedFocus),
  );

  if (!materialDefinition) {
    return null;
  }

  return ensureSentence(materialDefinition.excerpt);
};

export class LocalGroundedQuestionAnsweringService implements QuestionAnsweringService {
  constructor(
    private readonly llmService: LLMService,
    private readonly sessionGroundedContextBuilder: SessionGroundedContextBuilder,
  ) {}

  async answerQuestion(
    sessionId: string,
    questionText: string,
    retrieval: RetrievalResult,
    category: QACategory | null,
  ): Promise<GroundedAnswerDraft> {
    const serviceStartedAt = Date.now();
    const rankedMatches = sortMatchesByPriority(retrieval.matches);
    const generationMatches = rankedMatches.slice(0, appConfig.groundedAnswer.maxReasoningSources);
    const traceableMatches = generationMatches.slice(0, appConfig.groundedAnswer.maxTraceableSources);

    logDev('ask', 'Preparing grounded answer generation', {
      categoryId: category?.id ?? null,
      questionLength: questionText.length,
      retrievalMatchCount: retrieval.matches.length,
      generationMatchCount: generationMatches.length,
      traceableMatchCount: traceableMatches.length,
    });

    if (!generationMatches.length) {
      logDev('ask', 'Grounded answer generation skipped because no prioritized evidence was found', {
        durationMs: Date.now() - serviceStartedAt,
      });

      return {
        supported: false,
        answerText: buildUnsupportedAnswer(),
        confidenceScore: 0,
        sources: [],
        category,
      };
    }

    const deterministicDefinitionAnswer = buildDeterministicDefinitionAnswer(questionText, generationMatches);
    const hasStrongDefinitionEvidence = generationMatches.some((match) =>
      candidateContainsQuestionFocus(questionText, `${match.label} ${match.excerpt}`),
    );

    const generationStartedAt = Date.now();
    const groundedSessionEvidence = await this.sessionGroundedContextBuilder.buildAnswerEvidence(
      sessionId,
      questionText,
      generationMatches,
    );

    logDev('ask', 'Starting grounded answer text generation', {
      evidenceCount: generationMatches.length,
      sessionEvidenceCount: groundedSessionEvidence.length,
      visualEvidenceCount: 0,
      sourceTypes: generationMatches.map((match) => match.sourceType),
    });

    const generationInput = {
      mode: 'answer' as const,
      question: questionText,
      instruction: category
        ? `Answer this ${category.label.toLowerCase()} question using only the grounded lecture evidence. Keep the answer concise, direct, and lecture-specific. If the evidence does not clearly answer the exact question, return exactly: unsupported.`
        : 'Answer the question using only the grounded lecture evidence. Keep the answer concise, direct, and lecture-specific. If the evidence does not clearly answer the exact question, return exactly: unsupported.',
      evidence: groundedSessionEvidence,
    };

    let answerText: string;
    try {
      answerText = await this.llmService.generateText(generationInput);
    } catch (error) {
      const shouldRetryCompact =
        error instanceof GemmaRuntimeError &&
        /gpu memory|out of memory|cuda/i.test(error.message) &&
        groundedSessionEvidence.length > 8;

      if (!shouldRetryCompact) {
        throw error;
      }

      const compactEvidence = groundedSessionEvidence.slice(0, 8);
      logDev('ask', 'Retrying grounded answer generation with compact evidence after GPU memory failure', {
        originalEvidenceCount: groundedSessionEvidence.length,
        compactEvidenceCount: compactEvidence.length,
        message: error.message,
      });

      answerText = await this.llmService.generateText({
        ...generationInput,
        evidence: compactEvidence,
      });
    }
    const cleanedAnswerText = sanitizeGroundedAnswerText(answerText, questionText);
    const limitedAnswerText = limitAnswerText(cleanedAnswerText);

    logDev('ask', 'Grounded answer text generation completed', {
      durationMs: Date.now() - generationStartedAt,
      rawAnswerLength: answerText.length,
      cleanedAnswerLength: cleanedAnswerText.length,
      totalDurationMs: Date.now() - serviceStartedAt,
    });

    const confidenceMatches = traceableMatches.length ? traceableMatches : generationMatches;
    const averageScore =
      confidenceMatches.reduce((sum, match) => sum + match.score, 0) / confidenceMatches.length;

    if (isUnsupportedGroundedAnswerText(cleanedAnswerText) || !limitedAnswerText) {
      if (deterministicDefinitionAnswer) {
        logDev('ask', 'Using deterministic grounded definition fallback after generative refusal', {
          durationMs: Date.now() - serviceStartedAt,
          answerLength: deterministicDefinitionAnswer.length,
        });

        return {
          supported: true,
          answerText: deterministicDefinitionAnswer,
          confidenceScore: Math.min(0.98, Number((averageScore / 2.5).toFixed(2))),
          sources: traceableMatches,
          category,
        };
      }

      if (!hasStrongDefinitionEvidence) {
        logDev('ask', 'Model declined weakly focused definition evidence', {
          durationMs: Date.now() - serviceStartedAt,
          questionText,
        });
      }

      return {
        supported: false,
        answerText: buildUnsupportedAnswer(),
        confidenceScore: 0,
        sources: [],
        category,
      };
    }

    return {
      supported: true,
      answerText: limitedAnswerText,
      confidenceScore: Math.min(0.98, Number((averageScore / 2.5).toFixed(2))),
      sources: traceableMatches,
      category,
    };
  }
}
