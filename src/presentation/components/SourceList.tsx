import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AnswerSource } from '@domain/entities/AnswerSource';
import { themeColors } from '@presentation/theme/tokens';
import type { AnswerSourcePreview } from '@presentation/types/AnswerSourcePreview';

interface SourceListProps {
  sources: AnswerSource[];
  onSourcePress?: (source: AnswerSource) => void;
  sourcePreviewById?: Record<string, AnswerSourcePreview>;
}

export const SourceList = ({ sources, onSourcePress, sourcePreviewById }: SourceListProps) => (
  <View style={styles.container}>
    {sources.map((source) => {
      const preview = sourcePreviewById?.[source.id];

      return (
        <Pressable
          key={source.id}
          disabled={!onSourcePress}
          onPress={() => {
            onSourcePress?.(source);
          }}
          style={({ pressed }) => [
            styles.sourceCard,
            onSourcePress ? styles.sourceCardInteractive : null,
            pressed && onSourcePress ? styles.sourceCardPressed : null,
          ]}
        >
          {preview ? (
            <Image resizeMode="cover" source={{ uri: preview.previewUri }} style={styles.preview} />
          ) : null}
          <Text style={styles.label}>{source.label}</Text>
          {preview ? (
            <>
              <Text style={styles.previewTitle}>{preview.title}</Text>
              <Text style={styles.previewMeta}>
                {preview.assetFileName}
                {preview.metadata ? ` | ${preview.metadata}` : ''}
              </Text>
            </>
          ) : null}
          <Text style={styles.excerpt}>{source.excerpt}</Text>
          {onSourcePress ? <Text style={styles.cta}>Inspect source</Text> : null}
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sourceCard: {
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 4,
  },
  sourceCardInteractive: {
    borderColor: themeColors.primarySoft,
  },
  sourceCardPressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  preview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
  },
  previewMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  excerpt: {
    fontSize: 13,
    lineHeight: 18,
    color: '#334155',
  },
  cta: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
