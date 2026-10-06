import type { ReactNode, RefObject } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { surfaces, BLUR_INTENSITY, GLASS_RADIUS } from '@/theme/tokens';

export type GlassSurface = 'glass' | 'flat';

export interface GlassPanelProps {
  children?: ReactNode;
  surface?: GlassSurface;          // default 'glass'
  intensity?: number;              // default BLUR_INTENSITY
  radius?: number;                 // default GLASS_RADIUS
  // Android only: ref to the BlurTargetView behind this panel. It must be a sibling
  // of the panel, never an ancestor. Without it Android renders the flat surface.
  // Not used by any screen yet: on the API 35 emulator the real blur rendered as an
  // unreadable grey panel (Card 109 QA). Verify on a physical device before opting in.
  blurTarget?: RefObject<View | null>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * True when real blur is affordable: iOS always; Android only on SDK 31+ AND with a
 * BlurTargetView to sample. Without a target expo-blur silently degrades to 'none',
 * so we fall back to the designed flat surface instead.
 */
export function canUseBlur(hasBlurTarget: boolean): boolean {
  if (Platform.OS === 'ios') return true;
  return Platform.OS === 'android' && Number(Platform.Version) >= 31 && hasBlurTarget;
}

export function GlassPanel({
  children,
  surface = 'glass',
  intensity = BLUR_INTENSITY,
  radius = GLASS_RADIUS,
  blurTarget,
  style,
  testID,
}: GlassPanelProps) {
  if (surface === 'flat' || !canUseBlur(blurTarget !== undefined)) {
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
      blurTarget={blurTarget}
      style={[
        {
          backgroundColor: surfaces.glass.background,
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
