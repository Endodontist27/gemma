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
          <View style={styles.headerRow}>
            <Text style={styles.label}>{source.label}</Text>
            {onSourcePress ? <Text style={styles.cta}>Open evidence</Text> : null}
          </View>
          {preview ? (
            <>
              <Text style={styles.previewTitle}>{preview.title}</Text>
              <Text style={styles.previewMeta}>
                {preview.assetFileName}
                {preview.metadata ? ` - ${preview.metadata}` : ''}
              </Text>
            </>
          ) : null}
          <Text style={styles.excerpt}>{source.excerpt}</Text>
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
    borderRadius: 16,
    backgroundColor: '#f7fcfc',
    borderWidth: 1,
    borderColor: '#cde4e7',
    padding: 13,
    gap: 7,
  },
  sourceCardInteractive: {
    borderColor: '#84d8d5',
    shadowColor: themeColors.primaryDeep,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 1,
  },
  sourceCardPressed: {
    opacity: 0.8,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primaryDeep,
    flex: 1,
  },
  preview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 13,
    backgroundColor: themeColors.primarySoft,
  },
  previewMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: themeColors.textSubtle,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.text,
  },
  excerpt: {
    fontSize: 13,
    lineHeight: 19,
    color: themeColors.textMuted,
  },
  cta: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
