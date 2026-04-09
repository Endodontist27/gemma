import { createContext, useContext, type PropsWithChildren } from 'react';

import type { AppContainer } from '@/app-shell/bootstrap/types';

const AppContainerContext = createContext<AppContainer | null>(null);

interface AppContainerProviderProps extends PropsWithChildren {
  container: AppContainer;
}

export const AppContainerProvider = ({ children, container }: AppContainerProviderProps) => (
  <AppContainerContext.Provider value={container}>{children}</AppContainerContext.Provider>
);

export const useAppContainer = () => {
  const container = useContext(AppContainerContext);

  if (!container) {
    throw new Error('AppContainerProvider is missing from the component tree.');
  }

  return container;
};
