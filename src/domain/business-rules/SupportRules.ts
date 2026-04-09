import { appConfig } from '@shared/config/appConfig';
import type { RetrievalResult } from '@domain/service-contracts/RetrievalService';
import {
  candidateContainsQuestionFocus,
  isDefinitionStyleQuestion,
} from '@infrastructure/retrieval-engine/scoring';

const getCandidateText = (label: string, excerpt: string) => `${label} ${excerpt}`;

export const hasGroundedSupport = (questionText: string, retrieval: RetrievalResult) => {
  if (!retrieval.matches.length) {
    return false;
  }

  const topMatches = retrieval.matches.slice(0, 3);
  const strongestScore = topMatches[0]?.score ?? 0;
  const averageTopScore =
    topMatches.reduce((sum, match) => sum + match.score, 0) / topMatches.length;
  const cumulativeTopScore = topMatches.reduce((sum, match) => sum + match.score, 0);
  const focusedMatchCount = topMatches.filter((match) =>
    candidateContainsQuestionFocus(questionText, getCandidateText(match.label, match.excerpt)),
  ).length;
  const hasDiverseTopEvidence = new Set(topMatches.map((match) => match.sourceType)).size >= 2;
  const supportThreshold = appConfig.retrieval.supportThreshold;

  if (strongestScore >= supportThreshold) {
    return true;
  }

  if (focusedMatchCount >= 1 && strongestScore >= supportThreshold - 0.15) {
    return true;
  }

  if (focusedMatchCount >= 2 && averageTopScore >= supportThreshold - 0.2) {
    return true;
  }

  if (
    !isDefinitionStyleQuestion(questionText) &&
    hasDiverseTopEvidence &&
    cumulativeTopScore >= supportThreshold * 2.15
  ) {
    return true;
  }

  return false;
};
