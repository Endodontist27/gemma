import { Image, StyleSheet, Text, View } from 'react-native';

import { cardShadow, themeColors } from '@presentation/theme/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
}

export const ScreenHeader = ({ title, subtitle, eyebrow }: ScreenHeaderProps) => (
  <View style={styles.container}>
    <View style={styles.brandRow}>
      <Image resizeMode="cover" source={require('../../../assets/icon.png')} style={styles.logo} />
      <View style={styles.brandText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fbffff',
    borderColor: 'rgba(168, 201, 206, 0.75)',
    borderRadius: 26,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
    padding: 18,
    ...cardShadow,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  brandText: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: themeColors.primaryDeep,
  },
  subtitle: {
    color: themeColors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  title: {
    color: themeColors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
});
