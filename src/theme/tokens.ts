// No imports: this file is pure data.

export const colors = {
  base: '#090C13',
  card: '#11151F',
  sidebar: '#0D111A',
  secondary: '#1A2030',
  ink: {
    strong: '#F4F6FA',
    DEFAULT: '#E8EAF0',
    soft: '#C3C8D4',
    muted: '#9AA0B0',
    dim: '#6E7486',
    faint: '#5B6172',
  },
  brand: '#E8394B',
  brandDeep: '#C01F31',
  brandText: '#FF8A93',
  brandTextHi: '#FFB0B6',
  status: {
    QUARANTINED: '#9FB2FF',
    TESTING: '#F2BE72',
    RELEASED: '#6EE0AC',
    RESERVED: '#C2A9FF',
    DISCARDED: '#E29A9A',
  },
} as const;

// Mirrors the `.glass` and `.flat` rules in bloodlink-web globals.css.
export const surfaces = {
  glass: {
    background: 'rgba(255, 255, 255, 0.055)',
    borderColor: 'rgba(255, 255, 255, 0.13)',
    highlight: 'rgba(255, 255, 255, 0.16)', // inset top hairline
  },
  flat: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
} as const;

export const radii = {
  sm: 6, md: 8, lg: 10, xl: 14, xl2: 18, xl3: 22, xl4: 26,
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xl2: 24, xl3: 32 } as const;

// expo-blur `intensity` is 1..100, not pixels. Web uses blur(26px); 60 is the
// closest visual match on iOS. Verify against the Card 505 mockup and adjust here only.
export const BLUR_INTENSITY = 60;
export const GLASS_RADIUS = radii.xl2; // web GlassPanel uses rounded-2xl
