import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { SessionProvider, useSession } from '@/lib/auth/session';
import { useAppFonts } from '@/theme/typography';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync(); // module scope, NOT inside a component
SplashScreen.setOptions({ duration: 400, fade: true });

function RootNavigator() {
  const { status } = useSession();
  const [fontsLoaded, fontError] = useAppFonts();
  const ready = status !== 'loading' && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null; // splash is still up — never renders system-font text

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.base } }}>
      <Stack.Protected guard={status === 'signed-in'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signed-out'}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}
