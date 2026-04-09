import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LoadingView } from '@presentation/components/LoadingView';
import { useAppStore } from '@presentation/hooks/useAppStore';
import { createAppContainer } from '@shared/config/bootstrap/createAppContainer';
import { logDev } from '@shared/utils/debug';
import { serializeError } from '@shared/utils/serialization';

import { AppContainerProvider } from '@/app-shell/bootstrap/AppContainerContext';
import { bootstrapLectureWorkspace } from '@/app-shell/bootstrap/bootstrapLectureWorkspace';

const BootstrapErrorView = ({ error }: { error: string }) => (
  <View style={styles.centered}>
    <Text style={styles.title}>Bootstrap failed</Text>
    <Text style={styles.body}>{error}</Text>
  </View>
);

export default function AppBootstrapGate({ children }: PropsWithChildren) {
  const setActiveSessionId = useAppStore((state) => state.setActiveSessionId);

  const [container] = useState(() => createAppContainer());
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [bootstrapMessage, setBootstrapMessage] = useState('Loading lecture workspace...');

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        logDev('bootstrap-gate', 'Starting app bootstrap');
        setIsBootstrapping(true);
        setBootstrapError(null);

        const result = await bootstrapLectureWorkspace({
          container,
          onProgress: (message) => {
            if (active) {
              setBootstrapMessage(message);
            }
          },
        });
        logDev('bootstrap-gate', 'Bootstrap result received', result);

        if (!active) {
          return;
        }

        setActiveSessionId(result.activeSessionId);
        setIsReady(true);
      } catch (error) {
        logDev('bootstrap-gate', 'Bootstrap failed', serializeError(error));
        if (active) {
          setBootstrapError(error instanceof Error ? error.message : 'App bootstrap failed.');
        }
      } finally {
        logDev('bootstrap-gate', 'Bootstrap finished');
        if (active) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [container, setActiveSessionId]);

  return (
    <AppContainerProvider container={container}>
      {bootstrapError ? <BootstrapErrorView error={bootstrapError} /> : null}
      {!bootstrapError && (!isReady || isBootstrapping) ? (
        <LoadingView message={bootstrapMessage} />
      ) : null}
      {!bootstrapError && isReady && !isBootstrapping ? children : null}
    </AppContainerProvider>
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
