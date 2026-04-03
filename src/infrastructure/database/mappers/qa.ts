import { AnswerSchema, type Answer } from '@domain/entities/Answer';
import { AnswerSourceSchema, type AnswerSource } from '@domain/entities/AnswerSource';
import { QACategorySchema, type QACategory } from '@domain/entities/QACategory';
import { QuestionSchema, type Question } from '@domain/entities/Question';
import { answerSources, answers, qaCategories, questions } from '@infrastructure/database/schema';

export const mapQuestionRecord = (record: typeof questions.$inferSelect): Question =>
  QuestionSchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    categoryId: record.categoryId,
    text: record.text,
    normalizedText: record.normalizedText,
    status: record.status,
    visibility: record.visibility,
    origin: record.origin,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });

export const toQuestionInsert = (entity: Question): typeof questions.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  categoryId: entity.categoryId,
  text: entity.text,
  normalizedText: entity.normalizedText,
  status: entity.status,
  visibility: entity.visibility,
  origin: entity.origin,
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
});

export const mapAnswerRecord = (record: typeof answers.$inferSelect): Answer =>
  AnswerSchema.parse({
    id: record.id,
    questionId: record.questionId,
    sessionId: record.sessionId,
    text: record.text,
    state: record.state,
    confidenceScore: record.confidenceScore,
    createdAt: record.createdAt,
  });

export const toAnswerInsert = (entity: Answer): typeof answers.$inferInsert => ({
  id: entity.id,
  questionId: entity.questionId,
  sessionId: entity.sessionId,
  text: entity.text,
  state: entity.state,
  confidenceScore: entity.confidenceScore,
  createdAt: entity.createdAt,
});

export const mapAnswerSourceRecord = (record: typeof answerSources.$inferSelect): AnswerSource =>
  AnswerSourceSchema.parse({
    id: record.id,
    answerId: record.answerId,
    sessionId: record.sessionId,
    sourceType: record.sourceType,
    sourceRecordId: record.sourceRecordId,
    label: record.label,
    excerpt: record.excerpt,
    relevanceScore: record.relevanceScore,
    createdAt: record.createdAt,
  });

export const toAnswerSourceInsert = (entity: AnswerSource): typeof answerSources.$inferInsert => ({
  id: entity.id,
  answerId: entity.answerId,
  sessionId: entity.sessionId,
  sourceType: entity.sourceType,
  sourceRecordId: entity.sourceRecordId,
  label: entity.label,
  excerpt: entity.excerpt,
  relevanceScore: entity.relevanceScore,
  createdAt: entity.createdAt,
});

export const mapQACategoryRecord = (record: typeof qaCategories.$inferSelect): QACategory =>
  QACategorySchema.parse({
    id: record.id,
    sessionId: record.sessionId,
    key: record.key,
    label: record.label,
    description: record.description,
    createdAt: record.createdAt,
  });

export const toQACategoryInsert = (entity: QACategory): typeof qaCategories.$inferInsert => ({
  id: entity.id,
  sessionId: entity.sessionId,
  key: entity.key,
  label: entity.label,
  description: entity.description,
  createdAt: entity.createdAt,
});
