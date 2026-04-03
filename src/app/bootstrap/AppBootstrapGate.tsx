import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppContainerProvider } from '@app/bootstrap/AppContainerContext';
import { bundledDemoPackJson } from '@app/bootstrap/demoPack';
import { LoadingView } from '@presentation/components/LoadingView';
import { useAppStore } from '@presentation/hooks/useAppStore';
import { appConfig } from '@shared/config/appConfig';

const loadCreateAppContainer = () => {
  const runtimeRequire = Function('return require')() as NodeRequire;
  const modulePath = ['./create', 'AppContainer'].join('');
  return (runtimeRequire(modulePath) as typeof import('@app/bootstrap/createAppContainer'))
    .createAppContainer;
};

const BootstrapErrorView = ({ error }: { error: string }) => (
  <View style={styles.centered}>
    <Text style={styles.title}>Bootstrap failed</Text>
    <Text style={styles.body}>{error}</Text>
  </View>
);

export const AppBootstrapGate = ({ children }: PropsWithChildren) => {
  const bootstrapError = useAppStore((state) => state.bootstrapError);
  const isBootstrapping = useAppStore((state) => state.isBootstrapping);
  const isReady = useAppStore((state) => state.isReady);
  const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);
  const setBootstrapError = useAppStore((state) => state.setBootstrapError);
  const setIsBootstrapping = useAppStore((state) => state.setIsBootstrapping);
  const setIsReady = useAppStore((state) => state.setIsReady);

  const [container] = useState(() => loadCreateAppContainer()());

  useEffect(() => {
    if (isReady || isBootstrapping) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        setIsBootstrapping(true);
        setBootstrapError(null);

        const result = await container.orchestrators.appBootstrapOrchestrator.execute(
          bundledDemoPackJson,
          appConfig.demoPack.sourceLabel,
        );

        if (cancelled) {
          return;
        }

        setActiveSessionId(result.activeSessionId);
        setIsReady(true);
      } catch (error) {
        if (!cancelled) {
          setBootstrapError(error instanceof Error ? error.message : 'App bootstrap failed.');
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    container,
    isBootstrapping,
    isReady,
    setActiveSessionId,
    setBootstrapError,
    setIsBootstrapping,
    setIsReady,
  ]);

  return (
    <AppContainerProvider container={container}>
      {bootstrapError ? <BootstrapErrorView error={bootstrapError} /> : null}
      {!bootstrapError && (!isReady || isBootstrapping) ? <LoadingView /> : null}
      {!bootstrapError && isReady && !isBootstrapping ? children : null}
    </AppContainerProvider>
  );
};

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
