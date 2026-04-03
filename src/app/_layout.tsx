import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';

const loadAppBootstrapGate = () => {
  const runtimeRequire = Function('return require')() as NodeRequire;
  const modulePath = ['./bootstrap/', 'AppBootstrapGate'].join('');
  return (runtimeRequire(modulePath) as typeof import('./bootstrap/AppBootstrapGate'))
    .AppBootstrapGate;
};

export default function RootLayout() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Mobile only</Text>
        <Text style={styles.body}>
          Lecture Companion currently supports iOS and Android only. The local SQLite stack is
          intentionally disabled on web.
        </Text>
      </View>
    );
  }

  const AppBootstrapGate = loadAppBootstrapGate();

  return (
    <AppBootstrapGate>
      <StatusBar style="dark" />
      <Slot />
    </AppBootstrapGate>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  body: {
    textAlign: 'center',
    color: '#475569',
    lineHeight: 20,
  },
});
