import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@presentation/components/PrimaryButton';
import { themeColors } from '@presentation/theme/tokens';

interface QuestionComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const QuestionComposer = ({
  value,
  onChangeText,
  onSubmit,
  disabled = false,
  loading = false,
}: QuestionComposerProps) => (
  <View style={styles.container}>
    <View style={styles.promptRow}>
      <Text style={styles.promptTitle}>Private audience question</Text>
      <Text style={styles.promptMeta}>Cited answer or clear unsupported result</Text>
    </View>
    <TextInput
      multiline
      numberOfLines={4}
      onChangeText={onChangeText}
      placeholder="Ask about the active lecture using only its uploaded evidence"
      placeholderTextColor={themeColors.textSubtle}
      style={styles.input}
      value={value}
    />
    <PrimaryButton
      disabled={disabled || loading || value.trim().length === 0}
      label={loading ? 'Answering...' : 'Ask'}
      onPress={onSubmit}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  promptMeta: {
    color: themeColors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  promptRow: {
    gap: 3,
  },
  promptTitle: {
    color: themeColors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    minHeight: 118,
    borderWidth: 1,
    borderColor: '#a9d5d8',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 22,
    color: themeColors.text,
  },
});
