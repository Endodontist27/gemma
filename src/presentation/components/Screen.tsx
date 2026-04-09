import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { themeColors } from '@presentation/theme/tokens';

export const Screen = ({ children }: PropsWithChildren) => (
  <SafeAreaView edges={['top']} style={styles.safeArea}>
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.scrollView}
    >
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  inner: {
    gap: 18,
    paddingBottom: 28,
  },
});
