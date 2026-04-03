import type { AnswerSource } from '@domain/entities/AnswerSource';
import type { GlossaryTerm } from '@domain/entities/GlossaryTerm';
import type { MaterialChunk } from '@domain/entities/MaterialChunk';
import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';
import type { AnswerSourceType } from '@domain/value-objects/KnowledgeEnums';

const sourcePriorityScore: Record<AnswerSourceType, number> = {
  glossary_term: 2,
  material_chunk: 1.4,
  transcript_entry: 1,
};

interface ResolveAnswerSourcesParams {
  sessionId: string;
  answerId: string;
  sourceType: AnswerSourceType;
  sourceId: string;
  glossaryById: Map<string, GlossaryTerm>;
  chunkById: Map<string, MaterialChunk>;
  transcriptById: Map<string, TranscriptEntry>;
  createdAt: string;
  index: number;
}

export const resolveAnswerSource = ({
  sessionId,
  answerId,
  sourceType,
  sourceId,
  glossaryById,
  chunkById,
  transcriptById,
  createdAt,
  index,
}: ResolveAnswerSourcesParams): AnswerSource => {
  if (sourceType === 'glossary_term') {
    const source = glossaryById.get(sourceId);
    if (!source) {
      throw new Error(`Missing glossary source: ${sourceId}`);
    }

    return {
      id: `${answerId}_src_${index}`,
      answerId,
      sessionId,
      sourceType,
      sourceRecordId: sourceId,
      label: `Glossary: ${source.term}`,
      excerpt: source.definition,
      relevanceScore: sourcePriorityScore[sourceType],
      createdAt,
    };
  }

  if (sourceType === 'material_chunk') {
    const source = chunkById.get(sourceId);
    if (!source) {
      throw new Error(`Missing material chunk source: ${sourceId}`);
    }

    return {
      id: `${answerId}_src_${index}`,
      answerId,
      sessionId,
      sourceType,
      sourceRecordId: sourceId,
      label: `Material: ${source.heading}`,
      excerpt: source.text,
      relevanceScore: sourcePriorityScore[sourceType],
      createdAt,
    };
  }

  const source = transcriptById.get(sourceId);
  if (!source) {
    throw new Error(`Missing transcript source: ${sourceId}`);
  }

  return {
    id: `${answerId}_src_${index}`,
    answerId,
    sessionId,
    sourceType,
    sourceRecordId: sourceId,
    label: `Transcript: ${source.speakerLabel}`,
    excerpt: source.text,
    relevanceScore: sourcePriorityScore[sourceType],
    createdAt,
  };
};
