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
    {tone === 'accent' ? <View pointerEvents="none" style={styles.accentHalo} /> : null}
    {title || subtitle ? (
      <View style={styles.header}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    ) : null}
    <View style={styles.body}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  accentHalo: {
    position: 'absolute',
    top: -55,
    right: -52,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(24, 199, 191, 0.16)',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(168, 201, 206, 0.68)',
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#ffffff',
    gap: 14,
    overflow: 'hidden',
    ...cardShadow,
  },
  cardAccent: {
    backgroundColor: '#f4ffff',
    borderColor: '#9be7e4',
  },
  cardSubtle: {
    backgroundColor: '#f5fafb',
  },
  header: {
    gap: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    color: themeColors.textMuted,
    lineHeight: 21,
  },
  body: {
    gap: 12,
  },
});
