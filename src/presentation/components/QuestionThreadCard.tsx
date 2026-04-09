import { StyleSheet, Text } from 'react-native';

import type { Answer } from '@domain/entities/Answer';
import type { AnswerSource } from '@domain/entities/AnswerSource';
import type { QACategory } from '@domain/entities/QACategory';
import type { Question } from '@domain/entities/Question';
import { SectionCard } from '@presentation/components/SectionCard';
import { SourceList } from '@presentation/components/SourceList';
import type { AnswerSourcePreview } from '@presentation/types/AnswerSourcePreview';
import { formatDateTime } from '@shared/utils/dates';

interface QuestionThreadCardProps {
  question: Question;
  answer: Answer | null;
  sources: AnswerSource[];
  category: QACategory | null;
  onSourcePress?: (source: AnswerSource) => void;
  sourcePreviewById?: Record<string, AnswerSourcePreview>;
}

const getStateLabel = (answer: Answer | null) => {
  if (!answer) {
    return 'No saved answer';
  }

  return answer.state === 'grounded' ? 'Grounded' : 'Unsupported';
};

export const QuestionThreadCard = ({
  question,
  answer,
  sources,
  category,
  onSourcePress,
  sourcePreviewById,
}: QuestionThreadCardProps) => {
  const subtitle = [
    category?.label ?? 'Uncategorized',
    getStateLabel(answer),
    formatDateTime(question.createdAt),
  ].join(' | ');

  return (
    <SectionCard subtitle={subtitle} title={question.text}>
      <Text style={styles.answer}>{answer?.text ?? 'No grounded answer stored yet.'}</Text>
      {sources.length ? (
        <SourceList
          onSourcePress={onSourcePress}
          sourcePreviewById={sourcePreviewById}
          sources={sources}
        />
      ) : null}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  answer: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 22,
  },
});
