import { z } from 'zod';

export const LectureSessionStatusSchema = z.enum(['scheduled', 'live', 'ended']);
export type LectureSessionStatus = z.infer<typeof LectureSessionStatusSchema>;

export const LectureMaterialTypeSchema = z.enum([
  'slide_deck',
  'handout',
  'reading',
  'code_sample',
]);
export type LectureMaterialType = z.infer<typeof LectureMaterialTypeSchema>;

export const SummaryKindSchema = z.enum(['overview', 'key_points', 'exam_focus']);
export type SummaryKind = z.infer<typeof SummaryKindSchema>;
