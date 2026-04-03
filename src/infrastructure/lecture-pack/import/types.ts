import type { Answer } from '@domain/entities/Answer';
import type { AnswerSource } from '@domain/entities/AnswerSource';
import type { GlossaryTerm } from '@domain/entities/GlossaryTerm';
import type { LectureMaterial } from '@domain/entities/LectureMaterial';
import type { LectureSession } from '@domain/entities/LectureSession';
import type { MaterialChunk } from '@domain/entities/MaterialChunk';
import type { QACategory } from '@domain/entities/QACategory';
import type { Question } from '@domain/entities/Question';
import type { Summary } from '@domain/entities/Summary';
import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';

export interface PreparedPublicQuestion {
  question: Question;
  answer: Answer;
  sources: AnswerSource[];
}

export interface LecturePackSessionGraph {
  session: LectureSession;
  materials: LectureMaterial[];
  chunks: MaterialChunk[];
  glossary: GlossaryTerm[];
  transcript: TranscriptEntry[];
  summaries: Summary[];
  categories: QACategory[];
  publicQuestions: PreparedPublicQuestion[];
}
