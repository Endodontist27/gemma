import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import type { EvidenceUnitAnswerSourcePayloadDto } from '@application/dto/AnswerSourceDetailDto';
import { EmptyState } from '@presentation/components/EmptyState';
import { LoadingView } from '@presentation/components/LoadingView';
import { PrimaryButton } from '@presentation/components/PrimaryButton';
import { Screen } from '@presentation/components/Screen';
import { ScreenHeader } from '@presentation/components/ScreenHeader';
import { SectionCard } from '@presentation/components/SectionCard';
import { themeColors } from '@presentation/theme/tokens';
import { useAnswerSourceDetailViewModel } from '@presentation/view-models/useAnswerSourceDetailViewModel';
import { formatSecondsAsTimestamp } from '@shared/utils/dates';

const getSourceTypeLabel = (
  sourceType: 'glossary_term' | 'material_chunk' | 'transcript_entry' | 'evidence_unit',
) => sourceType.replace(/_/g, ' ');

const getGroundingStrengthLabel = (relevanceScore: number) => {
  if (relevanceScore >= 2.5) {
    return 'High grounding match';
  }

  if (relevanceScore >= 1.4) {
    return 'Medium grounding match';
  }

  return 'Supporting grounding match';
};

const buildEvidenceUnitMetadata = (payload: EvidenceUnitAnswerSourcePayloadDto) => {
  const parts = [payload.modality.replace(/_/g, ' ')];

  if (payload.pageNumber) {
    parts.push(`Page ${payload.pageNumber}`);
  }

  if (payload.slideNumber) {
    parts.push(`Slide ${payload.slideNumber}`);
  }

  if (payload.frameLabel) {
    parts.push(payload.frameLabel);
  }

  if (payload.timestampStartSeconds !== null) {
    parts.push(formatSecondsAsTimestamp(payload.timestampStartSeconds));
  }

  return parts.join(' | ');
};

export const AnswerSourceDetailScreen = ({ answerSourceId }: { answerSourceId: string }) => {
  const viewModel = useAnswerSourceDetailViewModel(answerSourceId);

  if (viewModel.isLoading && !viewModel.detail) {
    return (
      <Screen>
        <LoadingView message="Loading answer source..." />
      </Screen>
    );
  }

  if (!viewModel.detail) {
    return (
      <Screen>
        <ScreenHeader
          eyebrow="Answer traceability"
          subtitle="Inspect the exact local lecture evidence used to support an answer."
          title="Answer Source"
        />
        <EmptyState
          actionLabel="Retry"
          description={viewModel.error ?? 'The requested answer source could not be loaded.'}
          onAction={viewModel.reloadDetail}
          title="Source unavailable"
        />
      </Screen>
    );
  }

  const { detail } = viewModel;

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Answer traceability"
        subtitle="Review the cited excerpt and inspect the original local lecture evidence behind this answer."
        title={detail.answerSource.label}
      />

      <SectionCard
        subtitle={`${getSourceTypeLabel(detail.sourceType)} | ${getGroundingStrengthLabel(detail.relevanceScore)}`}
        title="Used in this answer"
      >
        <Text style={styles.body}>{detail.citedExcerpt}</Text>
      </SectionCard>

      <SectionCard title="Original lecture source">
        {detail.sourcePayload.kind === 'glossary_term' ? (
          <>
            <Text style={styles.heading}>{detail.sourcePayload.term}</Text>
            <Text style={styles.body}>{detail.sourcePayload.definition}</Text>
            {detail.sourcePayload.aliases.length ? (
              <Text style={styles.meta}>
                Aliases: {detail.sourcePayload.aliases.join(' | ')}
              </Text>
            ) : null}
          </>
        ) : null}

        {detail.sourcePayload.kind === 'material_chunk' ? (
          <>
            <Text style={styles.meta}>Material: {detail.sourcePayload.materialTitle}</Text>
            <Text style={styles.heading}>{detail.sourcePayload.heading}</Text>
            <Text style={styles.body}>{detail.sourcePayload.text}</Text>
            {detail.sourcePayload.keywords.length ? (
              <Text style={styles.meta}>
                Keywords: {detail.sourcePayload.keywords.join(' | ')}
              </Text>
            ) : null}
          </>
        ) : null}

        {detail.sourcePayload.kind === 'transcript_entry' ? (
          <>
            <Text style={styles.meta}>
              {detail.sourcePayload.speakerLabel} at{' '}
              {formatSecondsAsTimestamp(detail.sourcePayload.startedAtSeconds)}
            </Text>
            <Text style={styles.body}>{detail.sourcePayload.text}</Text>
          </>
        ) : null}

        {detail.sourcePayload.kind === 'evidence_unit' ? (
          <>
            <Text style={styles.meta}>File: {detail.sourcePayload.assetFileName}</Text>
            <Text style={styles.meta}>{buildEvidenceUnitMetadata(detail.sourcePayload)}</Text>
            {detail.sourcePayload.previewUri ? (
              <Image
                resizeMode="cover"
                source={{ uri: detail.sourcePayload.previewUri }}
                style={styles.preview}
              />
            ) : null}
            <Text style={styles.heading}>{detail.sourcePayload.title}</Text>
            <Text style={styles.body}>{detail.sourcePayload.text}</Text>
          </>
        ) : null}
      </SectionCard>

      <SectionCard
        subtitle="Save this evidence locally so you can revisit it in Notes later."
        title="Save this evidence"
      >
        <PrimaryButton
          label={
            viewModel.isBookmarking
              ? 'Updating bookmark...'
              : detail.bookmark
                ? 'Remove Bookmark'
                : 'Bookmark Source'
          }
          onPress={() => {
            void viewModel.toggleBookmark();
          }}
          tone="secondary"
        />
        {viewModel.bookmarkError ? <Text style={styles.error}>{viewModel.bookmarkError}</Text> : null}

        <View style={styles.noteComposer}>
          <Text style={styles.noteHeading}>Quick anchored note</Text>
          <TextInput
            multiline
            numberOfLines={4}
            onChangeText={viewModel.setNoteDraft}
            placeholder="Write a note linked to this exact evidence"
            style={styles.input}
            value={viewModel.noteDraft}
          />
          <PrimaryButton
            disabled={viewModel.isSavingNote || viewModel.noteDraft.trim().length === 0}
            label={viewModel.isSavingNote ? 'Saving note...' : 'Save Anchored Note'}
            onPress={() => {
              void viewModel.saveAnchoredNote();
            }}
          />
          {viewModel.noteError ? <Text style={styles.error}>{viewModel.noteError}</Text> : null}
        </View>
      </SectionCard>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: {
    color: themeColors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: themeColors.danger,
    fontSize: 13,
  },
  heading: {
    color: themeColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
    borderRadius: 16,
    padding: 14,
    backgroundColor: themeColors.surface,
    textAlignVertical: 'top',
    fontSize: 15,
    color: themeColors.text,
  },
  meta: {
    color: themeColors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
  },
  noteComposer: {
    gap: 10,
  },
  noteHeading: {
    color: themeColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  preview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: themeColors.surfaceMuted,
  },
});

export default AnswerSourceDetailScreen;
