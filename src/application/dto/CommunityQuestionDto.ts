import type { Answer } from '@domain/entities/Answer';
import type { AnswerSource } from '@domain/entities/AnswerSource';
import type { QACategory } from '@domain/entities/QACategory';
import type { Question } from '@domain/entities/Question';

export interface CommunityQuestionDto {
  question: Question;
  answer: Answer | null;
  sources: AnswerSource[];
  category: QACategory | null;
}
