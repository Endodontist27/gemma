import { create } from 'zustand';

interface AppStoreState {
  activeSessionId: string | null;
  bootstrapError: string | null;
  contentVersion: number;
  isBootstrapping: boolean;
  isReady: boolean;
  setActiveSessionId: (sessionId: string | null) => void;
  setBootstrapError: (error: string | null) => void;
  setIsBootstrapping: (value: boolean) => void;
  setIsReady: (value: boolean) => void;
  bumpContentVersion: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  activeSessionId: null,
  bootstrapError: null,
  contentVersion: 0,
  isBootstrapping: false,
  isReady: false,
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setBootstrapError: (bootstrapError) => set({ bootstrapError }),
  setIsBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  setIsReady: (isReady) => set({ isReady }),
  bumpContentVersion: () => set((state) => ({ contentVersion: state.contentVersion + 1 })),
}));
