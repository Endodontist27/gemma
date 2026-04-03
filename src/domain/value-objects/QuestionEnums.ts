import { z } from 'zod';

export const QuestionStatusSchema = z.enum(['supported', 'unsupported']);
export type QuestionStatus = z.infer<typeof QuestionStatusSchema>;

export const QuestionVisibilitySchema = z.enum(['public', 'private']);
export type QuestionVisibility = z.infer<typeof QuestionVisibilitySchema>;

export const QuestionOriginSchema = z.enum(['seed_public', 'user_local']);
export type QuestionOrigin = z.infer<typeof QuestionOriginSchema>;

export const AnswerStateSchema = z.enum(['grounded', 'unsupported']);
export type AnswerState = z.infer<typeof AnswerStateSchema>;
