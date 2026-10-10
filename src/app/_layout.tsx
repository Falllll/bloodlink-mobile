import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { OfflineProvider } from '@/lib/api/offline';
import { SessionProvider, useSession } from '@/lib/auth/session';
import '@/lib/location/task'; // side-effect import: registers the background location task at module scope
import { useAppFonts } from '@/theme/typography';
import { colors, spacing } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync(); // module scope, NOT inside a component
SplashScreen.setOptions({ duration: 400, fade: true });

function RootNavigator() {
  const { status } = useSession();
  const [fontsLoaded, fontError] = useAppFonts();
  const ready = status !== 'loading' && (fontsLoaded || fontError !== null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null; // splash is still up — never renders system-font text

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.base } }}>
        <Stack.Protected guard={status === 'signed-in'}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signed-out'}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
      <View
        style={{
          position: 'absolute',
          top: insets.top,
          left: spacing.lg,
          right: spacing.lg,
          pointerEvents: 'box-none',
        }}
      >
        <OfflineBanner />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <OfflineProvider>
        <RootNavigator />
      </OfflineProvider>
    </SessionProvider>
  );
}
