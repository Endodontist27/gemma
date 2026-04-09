import { create } from 'zustand';

interface AppStoreState {
  activeSessionId: string | null;
  contentVersion: number;
  setActiveSessionId: (sessionId: string | null) => void;
  bumpContentVersion: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  activeSessionId: null,
  contentVersion: 0,
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  bumpContentVersion: () => set((state) => ({ contentVersion: state.contentVersion + 1 })),
}));
