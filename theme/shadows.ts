import { Platform } from 'react-native';

/**
 * Shadows are used sparingly. The design system prefers borders and surface
 * differentiation; these tokens exist for the few places (floating action
 * button, sheets, toasts) that need to visually detach from the page.
 */
type Shadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const make = (opacity: number, radiusPx: number, offsetY: number, elevation: number): Shadow => ({
  shadowColor: '#101310',
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: Platform.OS === 'android' ? 0 : opacity,
  shadowRadius: radiusPx,
  elevation,
});

export const shadows = {
  none: make(0, 0, 0, 0),
  subtle: make(0.04, 8, 2, 1),
  card: make(0.06, 12, 4, 2),
  floating: make(0.12, 20, 8, 6),
  overlay: make(0.18, 28, 12, 10),
};
