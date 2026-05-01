import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { themeColors } from '@presentation/theme/tokens';

export const Screen = ({ children }: PropsWithChildren) => (
  <SafeAreaView edges={['top']} style={styles.safeArea}>
    <View pointerEvents="none" style={styles.backdrop}>
      <View style={[styles.orb, styles.orbPrimary]} />
      <View style={[styles.orb, styles.orbWarm]} />
    </View>
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.scrollView}
    >
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  inner: {
    gap: 16,
    paddingBottom: 34,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.72,
  },
  orbPrimary: {
    top: -110,
    right: -96,
    width: 230,
    height: 230,
    backgroundColor: themeColors.accentSoft,
  },
  orbWarm: {
    top: 210,
    left: -125,
    width: 210,
    height: 210,
    backgroundColor: themeColors.warmSoft,
  },
});
