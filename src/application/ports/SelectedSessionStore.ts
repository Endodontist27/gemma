export interface SelectedSessionStore {
  getSelectedSessionId(): Promise<string | null>;
  setSelectedSessionId(sessionId: string | null): Promise<void>;
}
