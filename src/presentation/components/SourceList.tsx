import { StyleSheet, Text, View } from 'react-native';

import type { AnswerSource } from '@domain/entities/AnswerSource';

export const SourceList = ({ sources }: { sources: AnswerSource[] }) => (
  <View style={styles.container}>
    {sources.map((source) => (
      <View key={source.id} style={styles.sourceCard}>
        <Text style={styles.label}>{source.label}</Text>
        <Text style={styles.excerpt}>{source.excerpt}</Text>
      </View>
    ))}
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
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  excerpt: {
    fontSize: 13,
    lineHeight: 18,
    color: '#334155',
  },
});
