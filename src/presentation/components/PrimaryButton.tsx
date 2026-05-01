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
    style={({ pressed }) => [
      styles.button,
      tone === 'secondary' ? styles.secondaryButton : styles.primaryButton,
      pressed && !disabled ? styles.pressed : null,
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
    minHeight: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: themeColors.primary,
    shadowColor: themeColors.primaryDeep,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.48,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  primaryLabel: {
    color: themeColors.surface,
  },
  secondaryLabel: {
    color: themeColors.text,
  },
});
