import { z } from 'zod';

export const AnswerSourceTypeSchema = z.enum([
  'glossary_term',
  'material_chunk',
  'transcript_entry',
]);
export type AnswerSourceType = z.infer<typeof AnswerSourceTypeSchema>;

export const BookmarkTargetTypeSchema = z.enum([
  'lecture_material',
  'material_chunk',
  'glossary_term',
  'transcript_entry',
]);
export type BookmarkTargetType = z.infer<typeof BookmarkTargetTypeSchema>;

export const NoteAnchorTypeSchema = z.enum([
  'session',
  'lecture_material',
  'material_chunk',
  'transcript_entry',
]);
export type NoteAnchorType = z.infer<typeof NoteAnchorTypeSchema>;
