import { Tabs } from 'expo-router/js-tabs';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { colors, surfaces } from '@/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.ink.dim,
        tabBarStyle: { backgroundColor: 'transparent', borderTopColor: surfaces.glass.borderColor, position: 'absolute' },
        tabBarBackground: () => <GlassPanel surface="glass" radius={0} style={{ flex: 1 }} />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="requests" options={{ title: 'Permintaan' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Jadwal' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
