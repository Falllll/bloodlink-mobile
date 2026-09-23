import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { surfaces, BLUR_INTENSITY, GLASS_RADIUS } from '@/theme/tokens';

export type GlassSurface = 'glass' | 'flat';

export interface GlassPanelProps {
  children?: ReactNode;
  surface?: GlassSurface;          // default 'glass'
  intensity?: number;              // default BLUR_INTENSITY
  radius?: number;                 // default GLASS_RADIUS
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** True when real blur is affordable: iOS always, Android only on SDK 31+. */
export function canUseBlur(): boolean {
  return Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 31);
}

export function GlassPanel({
  children,
  surface = 'glass',
  intensity = BLUR_INTENSITY,
  radius = GLASS_RADIUS,
  style,
  testID,
}: GlassPanelProps) {
  if (surface === 'flat' || !canUseBlur()) {
    return (
      <View
        testID={testID}
        style={[
          {
            backgroundColor: surfaces.flat.background,
            borderColor: surfaces.flat.borderColor,
            borderWidth: 1,
            borderRadius: radius,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      testID={testID}
      intensity={intensity}
      tint="dark"
      blurMethod="dimezisBlurViewSdk31Plus"
      style={[
        {
          borderColor: surfaces.glass.borderColor,
          borderWidth: 1,
          borderRadius: radius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}
