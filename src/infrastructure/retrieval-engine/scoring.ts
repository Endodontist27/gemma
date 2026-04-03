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
