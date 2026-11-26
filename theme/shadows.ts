import { Platform, type ViewStyle } from 'react-native';

/**
 * Shadows are used sparingly. Cards get a soft elevation: a short contact
 * shadow plus a wide, faint ambient. Stronger tokens stay on controls that
 * have to detach from the page (floating action button, sheets, toasts, dialogs).
 *
 * Soft tokens use `boxShadow` with elevation 0. Android's elevation API draws
 * a hard gray plate, which made cards look much heavier than the iOS shadow.
 * Android also needs stronger alphas (and no negative spread) or the shadow
 * reads as flat on emulators and many devices.
 */
type Shadow = ViewStyle;

const lifted = (opacity: number, radiusPx: number, offsetY: number, elevation: number): Shadow => ({
  shadowColor: '#101310',
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: Platform.OS === 'android' ? 0 : opacity,
  shadowRadius: radiusPx,
  elevation,
});

const soft = (
  ios: NonNullable<ViewStyle['boxShadow']>,
  android: NonNullable<ViewStyle['boxShadow']> = ios
): Shadow => ({
  boxShadow: Platform.OS === 'android' ? android : ios,
  elevation: 0,
});

const ink = (alpha: number) => `rgba(16, 19, 16, ${alpha})`;

export const shadows = {
  none: soft('0 0 0 transparent'),
  subtle: soft(
    [{ offsetX: 0, offsetY: 1, blurRadius: 2, color: ink(0.04) }],
    [{ offsetX: 0, offsetY: 1, blurRadius: 3, color: ink(0.12) }]
  ),
  // Negative spread keeps the ambient shadow under the card on iOS so a list
  // of cards does not pool into a gray band between rows. Android skips the
  // negative spread — it often flattens the shadow to nothing on emulator.
  card: soft(
    [
      { offsetX: 0, offsetY: 1, blurRadius: 1, color: ink(0.04) },
      { offsetX: 0, offsetY: 8, blurRadius: 20, spreadDistance: -8, color: ink(0.06) },
    ],
    [
      { offsetX: 0, offsetY: 1, blurRadius: 2, color: ink(0.1) },
      { offsetX: 0, offsetY: 6, blurRadius: 16, color: ink(0.18) },
    ]
  ),
  floating: lifted(0.12, 20, 8, 6),
  overlay: lifted(0.18, 28, 12, 10),
};
