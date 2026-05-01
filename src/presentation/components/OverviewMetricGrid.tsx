import { StyleSheet, Text, View } from 'react-native';

import type { SessionOverviewCountsDto } from '@application/dto/SessionOverviewDto';
import { themeColors } from '@presentation/theme/tokens';

interface OverviewMetricGridProps {
  counts: SessionOverviewCountsDto;
}

const metricConfig: { key: keyof SessionOverviewCountsDto; label: string }[] = [
  { key: 'materialCount', label: 'Materials' },
  { key: 'chunkCount', label: 'Chunks' },
  { key: 'glossaryTermCount', label: 'Glossary' },
  { key: 'transcriptEntryCount', label: 'Transcript' },
  { key: 'publicQuestionCount', label: 'Public Q&A' },
  { key: 'noteCount', label: 'Notes' },
  { key: 'bookmarkCount', label: 'Bookmarks' },
];

export const OverviewMetricGrid = ({ counts }: OverviewMetricGridProps) => (
  <View style={styles.grid}>
    {metricConfig.map((metric) => (
      <View key={metric.key} style={styles.card}>
        <Text style={styles.value}>{counts[metric.key]}</Text>
        <Text style={styles.label}>{metric.label}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    minWidth: '31%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cfe4e7',
    backgroundColor: '#f7fcfc',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  label: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: themeColors.primaryDeep,
    fontSize: 20,
    fontWeight: '800',
  },
});
