import { useEffect, useState } from 'react';

import type { AnswerSourceDetailDto } from '@application/dto/AnswerSourceDetailDto';
import { useAppStore } from '@presentation/hooks/useAppStore';
import { useAppContainer } from '@/app-shell/bootstrap/AppContainerContext';

const buildBookmarkLabel = (detail: AnswerSourceDetailDto) => {
  if (detail.sourcePayload.kind === 'glossary_term') {
    return detail.sourcePayload.term;
  }

  if (detail.sourcePayload.kind === 'material_chunk') {
    return detail.sourcePayload.heading;
  }

  if (detail.sourcePayload.kind === 'evidence_unit') {
    return detail.sourcePayload.title;
  }

  return `${detail.sourcePayload.speakerLabel} transcript`;
};

export const useAnswerSourceDetailViewModel = (answerSourceId: string) => {
  const container = useAppContainer();
  const getAnswerSourceDetailUseCase = container.useCases.getAnswerSourceDetailUseCase;
  const toggleBookmarkUseCase = container.useCases.toggleBookmarkUseCase;
  const createNoteUseCase = container.useCases.createNoteUseCase;
  const contentVersion = useAppStore((state) => state.contentVersion);
  const bumpContentVersion = useAppStore((state) => state.bumpContentVersion);

  const [detail, setDetail] = useState<AnswerSourceDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    if (!answerSourceId) {
      setDetail(null);
      setError('Missing answer source id.');
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getAnswerSourceDetailUseCase.execute(answerSourceId);

        if (!cancelled) {
          if (!response) {
            setDetail(null);
            setError('This answer source is no longer available in the local lecture data.');
            return;
          }

          setDetail(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setDetail(null);
          setError(
            loadError instanceof Error ? loadError.message : 'Failed to load answer source.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [answerSourceId, contentVersion, getAnswerSourceDetailUseCase, reloadVersion]);

  const reloadDetail = () => {
    setReloadVersion((value) => value + 1);
  };

  const toggleBookmark = async () => {
    if (!detail || isBookmarking) {
      return;
    }

    try {
      setIsBookmarking(true);
      setBookmarkError(null);
      const result = await toggleBookmarkUseCase.execute(
        detail.answerSource.sessionId,
        detail.sourceType,
        detail.sourceRecordId,
        buildBookmarkLabel(detail),
      );

      setDetail((currentDetail) =>
        currentDetail
          ? {
              ...currentDetail,
              bookmark: result.bookmark,
            }
          : currentDetail,
      );
      bumpContentVersion();
    } catch (toggleError) {
      setBookmarkError(
        toggleError instanceof Error ? toggleError.message : 'Bookmark update failed.',
      );
    } finally {
      setIsBookmarking(false);
    }
  };

  const saveAnchoredNote = async () => {
    if (!detail || !noteDraft.trim() || isSavingNote) {
      return;
    }

    try {
      setIsSavingNote(true);
      setNoteError(null);
      await createNoteUseCase.execute(detail.answerSource.sessionId, noteDraft, {
        anchorType: detail.sourceType,
        anchorId: detail.sourceRecordId,
      });
      setNoteDraft('');
      bumpContentVersion();
    } catch (saveError) {
      setNoteError(saveError instanceof Error ? saveError.message : 'Failed to save note.');
    } finally {
      setIsSavingNote(false);
    }
  };

  return {
    bookmarkError,
    detail,
    error,
    isBookmarking,
    isLoading,
    isSavingNote,
    noteDraft,
    noteError,
    reloadDetail,
    saveAnchoredNote,
    setNoteDraft,
    toggleBookmark,
  };
};
