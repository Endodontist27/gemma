import { StyleSheet, TextInput, View } from 'react-native';

import { PrimaryButton } from '@presentation/components/PrimaryButton';

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
    <TextInput
      multiline
      numberOfLines={4}
      onChangeText={onChangeText}
      placeholder="Ask a grounded question about this lecture pack"
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
  input: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#0f172a',
  },
});
