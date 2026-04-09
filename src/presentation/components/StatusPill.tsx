import { StyleSheet, Text, View } from 'react-native';

import { themeColors } from '@presentation/theme/tokens';

interface StatusPillProps {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
}

const toneStyles = {
  neutral: {
    backgroundColor: themeColors.surfaceMuted,
    color: themeColors.textMuted,
  },
  primary: {
    backgroundColor: themeColors.primarySoft,
    color: themeColors.primaryDeep,
  },
  success: {
    backgroundColor: themeColors.successSoft,
    color: themeColors.success,
  },
  warning: {
    backgroundColor: themeColors.warningSoft,
    color: themeColors.warning,
  },
  danger: {
    backgroundColor: themeColors.dangerSoft,
    color: themeColors.danger,
  },
} as const;

export const StatusPill = ({ label, tone = 'neutral' }: StatusPillProps) => (
  <View style={[styles.pill, { backgroundColor: toneStyles[tone].backgroundColor }]}>
    <Text style={[styles.label, { color: toneStyles[tone].color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
