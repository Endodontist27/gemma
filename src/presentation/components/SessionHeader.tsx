import { StyleSheet, Text, View } from 'react-native';

import type { LectureSession } from '@domain/entities/LectureSession';
import { formatDateTime } from '@shared/utils/dates';

export const SessionHeader = ({ session }: { session: LectureSession }) => (
  <View style={styles.container}>
    <Text style={styles.courseCode}>{session.courseCode}</Text>
    <Text style={styles.title}>{session.title}</Text>
    <Text style={styles.meta}>
      {session.lecturer} | {session.location} | {formatDateTime(session.startsAt)}
    </Text>
    <Text style={styles.description}>{session.description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  meta: {
    fontSize: 13,
    color: '#475569',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
  },
});
