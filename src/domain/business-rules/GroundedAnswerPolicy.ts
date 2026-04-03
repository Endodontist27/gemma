import type { RetrievalMatch } from '@domain/service-contracts/RetrievalService';
import { ANSWER_SOURCE_PRIORITY } from '@shared/constants/qa';

export const sortMatchesByPriority = (matches: RetrievalMatch[]) =>
  [...matches].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return (
      ANSWER_SOURCE_PRIORITY.indexOf(left.sourceType) -
      ANSWER_SOURCE_PRIORITY.indexOf(right.sourceType)
    );
  });

export const buildUnsupportedAnswer = () =>
  'This question is not supported by the current on-device lecture pack. Ask about the glossary, lecture materials, or transcript loaded into this session.';
