import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import AppBootstrapGate from '@/app-shell/bootstrap/AppBootstrapGate';

export default function RootLayout() {
  return (
    <AppBootstrapGate>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="answer-sources/[answerSourceId]"
          options={{ title: 'Answer Source', presentation: 'card' }}
        />
      </Stack>
    </AppBootstrapGate>
  );
}
