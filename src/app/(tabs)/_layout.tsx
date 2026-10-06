import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { colors, surfaces } from '@/theme/tokens';
import { fontFamily } from '@/theme/typography';

function tabIcon(name: SymbolViewProps['name']) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <SymbolView name={name} tintColor={color} size={size} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.ink.dim,
        tabBarLabelStyle: { fontFamily: fontFamily.bodyMedium },
        tabBarStyle: { backgroundColor: 'transparent', borderTopColor: surfaces.glass.borderColor, position: 'absolute' },
        // No blurTarget: the tab screens are siblings rendered by the navigator, so on
        // Android this is the flat surface by design; iOS still gets real blur.
        tabBarBackground: () => <GlassPanel surface="glass" radius={0} style={{ flex: 1 }} />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: tabIcon({ ios: 'house.fill', android: 'home' }) }} />
      <Tabs.Screen name="requests" options={{ title: 'Permintaan', tabBarIcon: tabIcon({ ios: 'drop.fill', android: 'bloodtype' }) }} />
      <Tabs.Screen name="schedule" options={{ title: 'Jadwal', tabBarIcon: tabIcon({ ios: 'calendar', android: 'calendar_month' }) }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon({ ios: 'person.fill', android: 'person' }) }} />
    </Tabs>
  );
}
