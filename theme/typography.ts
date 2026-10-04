/**
 * SiteReport uses Inter as its primary typeface. Inter is a libre-licensed
 * (OFL) grotesque designed for UI legibility at small sizes, which makes it
 * suitable for a commercial product. Weights are loaded in app/_layout.tsx
 * via `@expo-google-fonts/inter` and referenced here by the family names
 * that package registers.
 */
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

type TypeStyle = {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing?: number;
};

export const typography: Record<
  'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyMedium' | 'bodySmall' | 'caption' | 'button' | 'label',
  TypeStyle
> = {
  display: { fontSize: 32, lineHeight: 38, fontFamily: fontFamily.semibold!, letterSpacing: -0.3 },
  h1: { fontSize: 28, lineHeight: 34, fontFamily: fontFamily.semibold!, letterSpacing: -0.2 },
  h2: { fontSize: 22, lineHeight: 28, fontFamily: fontFamily.semibold! },
  h3: { fontSize: 18, lineHeight: 24, fontFamily: fontFamily.semibold! },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.regular! },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.medium! },
  bodySmall: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.regular! },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.medium!, letterSpacing: 0.2 },
  button: { fontSize: 16, lineHeight: 20, fontFamily: fontFamily.semibold! },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium!, letterSpacing: 0.1 },
};

export type TypographyVariant = keyof typeof typography;
