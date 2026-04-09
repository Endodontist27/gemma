import { useEffect, useState } from 'react';

import type { GroundedAnswerResultDto } from '@application/dto/GroundedAnswerResultDto';
import type { QuestionHistoryItemDto } from '@application/dto/QuestionHistoryItemDto';
import { useAppStore } from '@presentation/hooks/useAppStore';
import type { AnswerSourcePreview } from '@presentation/types/AnswerSourcePreview';
import { logDev } from '@shared/utils/debug';
import { useAppContainer } from '@/app-shell/bootstrap/AppContainerContext';

export const useAskViewModel = () => {
  const container = useAppContainer();
  const lectureExperienceOrchestrator = container.orchestrators.lectureExperienceOrchestrator;
  const getAnswerSourceDetailUseCase = container.useCases.getAnswerSourceDetailUseCase;
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const contentVersion = useAppStore((state) => state.contentVersion);
  const bumpContentVersion = useAppStore((state) => state.bumpContentVersion);

  const [history, setHistory] = useState<QuestionHistoryItemDto[]>([]);
  const [historySessionId, setHistorySessionId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [result, setResult] = useState<GroundedAnswerResultDto | null>(null);
  const [historyReloadVersion, setHistoryReloadVersion] = useState(0);
  const [indexingReloadVersion, setIndexingReloadVersion] = useState(0);
  const [indexingSummary, setIndexingSummary] = useState<{
    processingCount: number;
    failedCount: number;
    totalCount: number;
  } | null>(null);
  const [sourcePreviewById, setSourcePreviewById] = useState<Record<string, AnswerSourcePreview>>({});

  useEffect(() => {
    setHistory([]);
    setHistorySessionId(null);
    setHistoryError(null);
    setQuestionText('');
    setResult(null);
    setSubmitError(null);
    setSourcePreviewById({});
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) {
      setHistory([]);
      setHistorySessionId(null);
      setHistoryError(null);
      setResult(null);
      setIsHistoryLoading(false);
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      try {
        setIsHistoryLoading(true);
        setHistoryError(null);
        const response = await lectureExperienceOrchestrator.getQuestionHistory(activeSessionId);

        if (!cancelled) {
          setHistory(response);
          setHistorySessionId(activeSessionId);
        }
      } catch (loadError) {
        if (!cancelled) {
          setHistoryError(
            loadError instanceof Error ? loadError.message : 'Failed to load question history.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, contentVersion, historyReloadVersion, lectureExperienceOrchestrator]);

  useEffect(() => {
    if (!activeSessionId) {
      setIndexingSummary(null);
      return;
    }

    let cancelled = false;

    const loadIndexingSummary = async () => {
      const assets = await container.repositories.uploadedAssetRepository.listBySession(activeSessionId);
      if (cancelled) {
        return;
      }

      setIndexingSummary({
        processingCount: assets.filter((asset) => asset.status === 'processing' || asset.status === 'pending').length,
        failedCount: assets.filter((asset) => asset.status === 'failed').length,
        totalCount: assets.length,
      });
    };

    void loadIndexingSummary();

    return () => {
      cancelled = true;
    };
  }, [
    activeSessionId,
    container.repositories.uploadedAssetRepository,
    contentVersion,
    indexingReloadVersion,
  ]);

  useEffect(() => {
    if (!indexingSummary?.processingCount) {
      return;
    }

    const timer = setTimeout(() => {
      setIndexingReloadVersion((value) => value + 1);
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [indexingSummary?.processingCount]);

  useEffect(() => {
    const visibleThreads = [
      ...(result?.question.sessionId === activeSessionId && result ? [result] : []),
      ...(historySessionId === activeSessionId ? history : []),
    ];
    const answerSources = visibleThreads.flatMap((item) => item.sources);

    if (!answerSources.length) {
      setSourcePreviewById({});
      return;
    }

    let cancelled = false;

    const loadSourcePreviews = async () => {
      const previewEntries = await Promise.all(
        answerSources.map(async (source) => {
          try {
            const detail = await getAnswerSourceDetailUseCase.execute(source.id);
            if (
              !detail ||
              detail.sourcePayload.kind !== 'evidence_unit' ||
              !detail.sourcePayload.previewUri
            ) {
              return null;
            }

            const metadataParts = [
              detail.sourcePayload.pageNumber ? `Page ${detail.sourcePayload.pageNumber}` : null,
              detail.sourcePayload.slideNumber ? `Slide ${detail.sourcePayload.slideNumber}` : null,
              detail.sourcePayload.frameLabel,
              detail.sourcePayload.timestampStartSeconds !== null
                ? detail.sourcePayload.timestampEndSeconds !== null
                  ? `${detail.sourcePayload.timestampStartSeconds}s-${detail.sourcePayload.timestampEndSeconds}s`
                  : `${detail.sourcePayload.timestampStartSeconds}s`
                : null,
            ].filter(Boolean);

            return [
              source.id,
              {
                previewUri: detail.sourcePayload.previewUri,
                title: detail.sourcePayload.title,
                assetFileName: detail.sourcePayload.assetFileName,
                metadata: metadataParts.length ? metadataParts.join(' | ') : null,
              } satisfies AnswerSourcePreview,
            ] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setSourcePreviewById(
        Object.fromEntries(previewEntries.filter((entry): entry is readonly [string, AnswerSourcePreview] => Boolean(entry))),
      );
    };

    void loadSourcePreviews();

    return () => {
      cancelled = true;
    };
  }, [
    activeSessionId,
    getAnswerSourceDetailUseCase,
    history,
    historySessionId,
    result,
  ]);

  const submitQuestion = async () => {
    const trimmedQuestion = questionText.trim();

    if (!activeSessionId || !trimmedQuestion) {
      return;
    }

    const submittedAt = Date.now();

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      logDev('ask-ui', 'Submitting question from Ask screen', {
        sessionId: activeSessionId,
        questionLength: trimmedQuestion.length,
      });
      const response = await lectureExperienceOrchestrator.askQuestion(
        activeSessionId,
        trimmedQuestion,
      );

      setResult(response);
      setQuestionText('');
      bumpContentVersion();
      logDev('ask-ui', 'Question request completed', {
        sessionId: activeSessionId,
        questionId: response.question.id,
        answerId: response.answer.id,
        answerState: response.answer.state,
        durationMs: Date.now() - submittedAt,
      });
    } catch (submitError) {
      logDev('ask-ui', 'Question request failed', {
        sessionId: activeSessionId,
        questionLength: trimmedQuestion.length,
        durationMs: Date.now() - submittedAt,
        message: submitError instanceof Error ? submitError.message : 'Question answering failed.',
      });
      setSubmitError(
        submitError instanceof Error ? submitError.message : 'Question answering failed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    activeSessionId,
    history: historySessionId === activeSessionId ? history : [],
    historyError,
    isHistoryLoading,
    isSubmitting,
    questionText,
    result: result?.question.sessionId === activeSessionId ? result : null,
    submitError,
    indexingSummary,
    sourcePreviewById,
    setQuestionText,
    submitQuestion,
    reloadHistory: () => {
      setHistoryReloadVersion((value) => value + 1);
    },
  };
};
