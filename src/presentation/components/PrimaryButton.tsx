import { Pressable, StyleSheet, Text } from 'react-native';

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
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
  },
  secondaryButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryLabel: {
    color: '#ffffff',
  },
  secondaryLabel: {
    color: '#1e3a8a',
  },
});
