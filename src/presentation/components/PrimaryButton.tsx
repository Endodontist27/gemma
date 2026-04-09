import { Pressable, StyleSheet, Text } from 'react-native';
import { themeColors } from '@presentation/theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
}

export const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  tone = 'primary',
}: PrimaryButtonProps) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    style={[
      styles.button,
      tone === 'secondary' ? styles.secondaryButton : styles.primaryButton,
      disabled ? styles.disabled : null,
    ]}
  >
    <Text
      style={[styles.label, tone === 'secondary' ? styles.secondaryLabel : styles.primaryLabel]}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: themeColors.primary,
  },
  secondaryButton: {
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
  },
  disabled: {
    opacity: 0.48,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryLabel: {
    color: themeColors.surface,
  },
  secondaryLabel: {
    color: themeColors.text,
  },
});
