import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { themeColors } from '@presentation/theme/tokens';

export const LoadingView = ({ message = 'Loading lecture workspace...' }: { message?: string }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={themeColors.primary} />
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'transparent',
    gap: 12,
  },
  message: {
    color: themeColors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});
