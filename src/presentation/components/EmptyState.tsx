import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@presentation/components/PrimaryButton';
import { cardShadow, themeColors } from '@presentation/theme/tokens';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ title, description, actionLabel, onAction }: EmptyStateProps) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {actionLabel && onAction ? (
      <View style={styles.action}>
        <PrimaryButton label={actionLabel} onPress={onAction} tone="secondary" />
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: themeColors.border,
    borderRadius: 20,
    padding: 18,
    backgroundColor: themeColors.surfaceMuted,
    gap: 8,
    ...cardShadow,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.text,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.textMuted,
  },
  action: {
    paddingTop: 6,
  },
});
