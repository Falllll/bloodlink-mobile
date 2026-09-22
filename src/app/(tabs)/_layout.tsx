import { Tabs } from 'expo-router/js-tabs';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="requests" options={{ title: 'Permintaan' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Jadwal' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
