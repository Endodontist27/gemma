import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export const LoadingView = ({ message = 'Loading lecture workspace...' }: { message?: string }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#1d4ed8" />
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  message: {
    color: '#334155',
    fontSize: 15,
    textAlign: 'center',
  },
});
