import { useState } from 'react';

import type { GroundedAnswerResultDto } from '@application/dto/GroundedAnswerResultDto';
import { useAppContainer } from '@app/bootstrap/AppContainerContext';
import { useAppStore } from '@presentation/hooks/useAppStore';

export const useAskViewModel = () => {
  const container = useAppContainer();
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const bumpContentVersion = useAppStore((state) => state.bumpContentVersion);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [result, setResult] = useState<GroundedAnswerResultDto | null>(null);

  const submitQuestion = async () => {
    if (!activeSessionId || !questionText.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await container.orchestrators.lectureExperienceOrchestrator.askQuestion(
        activeSessionId,
        questionText,
      );

      setResult(response);
      setQuestionText('');
      bumpContentVersion();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Question answering failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    activeSessionId,
    error,
    isSubmitting,
    questionText,
    result,
    setQuestionText,
    submitQuestion,
  };
};
