import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SectionCardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
}

export const SectionCard = ({ children, title, subtitle }: SectionCardProps) => (
  <View style={styles.card}>
    {title ? <Text style={styles.title}>{title}</Text> : null}
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    <View style={styles.body}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#dbe4f0',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  body: {
    gap: 12,
  },
});
