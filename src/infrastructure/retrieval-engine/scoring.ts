import { normalizeText, tokenize, uniqueStrings } from '@shared/utils/text';

const overlapRatio = (left: string[], right: string[]) => {
  if (!left.length || !right.length) {
    return 0;
  }

  const rightSet = new Set(right);
  const overlap = left.filter((token) => rightSet.has(token));
  return overlap.length / left.length;
};

export const computeTextMatchScore = (questionText: string, candidateText: string, boost = 0) => {
  const queryTokens = uniqueStrings(tokenize(questionText));
  const candidateTokens = uniqueStrings(tokenize(candidateText));

  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  const coverage = overlapRatio(queryTokens, candidateTokens);
  const density = overlapRatio(
    queryTokens,
    candidateTokens.slice(0, Math.max(queryTokens.length * 4, 8)),
  );

  return Number((coverage * 1.6 + density * 0.6 + boost).toFixed(3));
};

export const questionContainsTerm = (questionText: string, terms: string[]) => {
  const normalizedQuestion = normalizeText(questionText);
  return terms.some((term) => normalizedQuestion.includes(normalizeText(term)));
};

export const extractQuestionFocus = (questionText: string) => {
  const normalizedQuestion = normalizeText(questionText)
    .replace(/\?+$/g, '')
    .trim();

  const patterns = [
    /^what is (.+)$/i,
    /^what does (.+) mean$/i,
    /^define (.+)$/i,
    /^explain (.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedQuestion.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
};

export const isDefinitionStyleQuestion = (questionText: string) => extractQuestionFocus(questionText) !== null;

export const candidateContainsQuestionFocus = (questionText: string, candidateText: string) => {
  const focus = extractQuestionFocus(questionText);
  if (!focus) {
    return false;
  }

  return normalizeText(candidateText).includes(focus);
};

export const computeQuestionFocusBoost = (questionText: string, candidateText: string) => {
  const focus = extractQuestionFocus(questionText);
  if (!focus) {
    return 0;
  }

  const normalizedCandidate = normalizeText(candidateText);
  if (!normalizedCandidate.includes(focus)) {
    return 0;
  }

  const focusWordCount = focus.split(/\s+/).filter(Boolean).length;
  return focusWordCount >= 2 ? 0.7 : 0.4;
};
