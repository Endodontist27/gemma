import { StyleSheet, Text, View } from 'react-native';

import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';
import { formatSecondsAsTimestamp } from '@shared/utils/dates';

interface TranscriptTimelineProps {
  entries: TranscriptEntry[];
}

export const TranscriptTimeline = ({ entries }: TranscriptTimelineProps) => (
  <View style={styles.list}>
    {entries.map((entry) => (
      <View key={entry.id} style={styles.card}>
        <Text style={styles.meta}>
          {formatSecondsAsTimestamp(entry.startedAtSeconds)} | {entry.speakerLabel}
        </Text>
        <Text style={styles.body}>{entry.text}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  body: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 6,
  },
  list: {
    gap: 10,
  },
  meta: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '700',
  },
});
