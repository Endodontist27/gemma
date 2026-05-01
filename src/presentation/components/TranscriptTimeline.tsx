import { StyleSheet, Text, View } from 'react-native';

import type { TranscriptEntry } from '@domain/entities/TranscriptEntry';
import { themeColors } from '@presentation/theme/tokens';
import { formatSecondsAsTimestamp } from '@shared/utils/dates';

interface TranscriptTimelineProps {
  entries: TranscriptEntry[];
}

export const TranscriptTimeline = ({ entries }: TranscriptTimelineProps) => (
  <View style={styles.list}>
    {entries.map((entry) => (
      <View key={entry.id} style={styles.card}>
        <Text style={styles.meta}>
          {formatSecondsAsTimestamp(entry.startedAtSeconds)} - {entry.speakerLabel}
        </Text>
        <Text style={styles.body}>{entry.text}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  body: {
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cfe4e7',
    backgroundColor: '#f7fcfc',
    padding: 12,
    gap: 6,
  },
  list: {
    gap: 10,
  },
  meta: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
