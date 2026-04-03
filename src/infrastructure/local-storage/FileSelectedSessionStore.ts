import { Directory, File, Paths } from 'expo-file-system';

import type { SelectedSessionStore } from '@application/ports/SelectedSessionStore';

const appDirectory = new Directory(Paths.document, 'lecture-companion');
const selectedSessionFile = new File(appDirectory, 'selected-session.json');

export class FileSelectedSessionStore implements SelectedSessionStore {
  async getSelectedSessionId() {
    if (!appDirectory.exists || !selectedSessionFile.exists) {
      return null;
    }

    try {
      const raw = await selectedSessionFile.text();
      const parsed = JSON.parse(raw) as { sessionId?: string | null };
      return typeof parsed.sessionId === 'string' ? parsed.sessionId : null;
    } catch {
      return null;
    }
  }

  async setSelectedSessionId(sessionId: string | null) {
    if (!appDirectory.exists) {
      appDirectory.create({ idempotent: true, intermediates: true });
    }

    if (!selectedSessionFile.exists) {
      selectedSessionFile.create({ intermediates: true, overwrite: true });
    }

    selectedSessionFile.write(JSON.stringify({ sessionId }));
  }
}
