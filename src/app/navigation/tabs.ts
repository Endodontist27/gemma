import type { ComponentProps } from 'react';

import { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const tabMetadata: Record<string, { title: string; icon: IconName }> = {
  index: { title: 'Sessions', icon: 'albums-outline' },
  live: { title: 'Live', icon: 'pulse-outline' },
  ask: { title: 'Ask', icon: 'help-circle-outline' },
  community: { title: 'Community', icon: 'people-outline' },
  materials: { title: 'Materials', icon: 'document-text-outline' },
  notes: { title: 'Notes', icon: 'create-outline' },
};
