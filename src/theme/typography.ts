import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';

// Exact export names verified in the published packages — do not guess casing.
export const fontAssets = {
  Sora_600SemiBold, Sora_700Bold,
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
};

export const fontFamily = {
  display: 'Sora_700Bold',
  displaySemi: 'Sora_600SemiBold',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
} as const;

export type TextVariant = 'display' | 'title' | 'body' | 'label' | 'caption' | 'numeric';

export const typeScale: Record<TextVariant, { fontFamily: string; fontSize: number; lineHeight: number }> = {
  display: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fontFamily.displaySemi, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16 },
  numeric: { fontFamily: fontFamily.bodySemi, fontSize: 17, lineHeight: 22 },
};

/** Returns [loaded, error] exactly like expo-font's useFonts. */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts(fontAssets);
}
