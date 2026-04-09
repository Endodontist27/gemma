import { StyleSheet, Text, View } from 'react-native';

import { themeColors } from '@presentation/theme/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
}

export const ScreenHeader = ({ title, subtitle, eyebrow }: ScreenHeaderProps) => (
  <View style={styles.container}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  eyebrow: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    color: themeColors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
});
