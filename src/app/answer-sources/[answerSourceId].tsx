import { useLocalSearchParams } from 'expo-router';

import { AnswerSourceDetailScreen } from '@presentation/screens/AnswerSourceDetailScreen';

export default function AnswerSourceDetailRoute() {
  const params = useLocalSearchParams<{ answerSourceId?: string | string[] }>();
  const answerSourceId = Array.isArray(params.answerSourceId)
    ? params.answerSourceId[0] ?? ''
    : params.answerSourceId ?? '';

  return <AnswerSourceDetailScreen answerSourceId={answerSourceId} />;
}
