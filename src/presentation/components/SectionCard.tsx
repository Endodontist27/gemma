import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardShadow, themeColors } from '@presentation/theme/tokens';

interface SectionCardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  tone?: 'default' | 'accent' | 'subtle';
}

export const SectionCard = ({ children, title, subtitle, tone = 'default' }: SectionCardProps) => (
  <View
    style={[
      styles.card,
      tone === 'accent' ? styles.cardAccent : null,
      tone === 'subtle' ? styles.cardSubtle : null,
    ]}
  >
    {title ? <Text style={styles.title}>{title}</Text> : null}
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    <View style={styles.body}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 20,
    padding: 18,
    backgroundColor: themeColors.surface,
    gap: 10,
    ...cardShadow,
  },
  cardAccent: {
    backgroundColor: themeColors.surfaceAccent,
    borderColor: '#c7dcff',
  },
  cardSubtle: {
    backgroundColor: themeColors.surfaceMuted,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: themeColors.textMuted,
    lineHeight: 20,
  },
  body: {
    gap: 12,
  },
});
