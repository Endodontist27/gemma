import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { tabMetadata } from '@/app-shell/navigation/tabs';
import { themeColors } from '@presentation/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const metadata = tabMetadata[route.name] ?? { title: route.name, icon: 'ellipse-outline' };

        return {
          headerShown: false,
          headerTitle: metadata.title,
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: themeColors.textSubtle,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
          tabBarStyle: {
            backgroundColor: '#fbffff',
            borderTopColor: '#d4e6e9',
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name={metadata.icon} size={size} />
          ),
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: tabMetadata.index.title }} />
      <Tabs.Screen name="live" options={{ title: tabMetadata.live.title }} />
      <Tabs.Screen name="ask" options={{ title: tabMetadata.ask.title }} />
      <Tabs.Screen name="community" options={{ title: tabMetadata.community.title }} />
      <Tabs.Screen name="materials" options={{ title: tabMetadata.materials.title }} />
      <Tabs.Screen name="notes" options={{ title: tabMetadata.notes.title }} />
    </Tabs>
  );
}
