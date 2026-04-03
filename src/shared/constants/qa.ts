import type { AnswerSourceType } from '@domain/value-objects/KnowledgeEnums';

export const ANSWER_SOURCE_PRIORITY: readonly AnswerSourceType[] = [
  'glossary_term',
  'material_chunk',
  'transcript_entry',
];

export const ANSWER_SOURCE_LABELS: Record<AnswerSourceType, string> = {
  glossary_term: 'Glossary',
  material_chunk: 'Lecture Material',
  transcript_entry: 'Transcript',
};
