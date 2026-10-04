export const colors = {
  background: '#F7F8F7',
  surface: '#FFFFFF',
  textPrimary: '#101310',
  textSecondary: '#66706A',
  border: '#E6E9E6',
  accent: '#34D058',
  cta: '#101310',
  success: '#1A9B46',
  warning: '#D68A1F',
  destructive: '#D64045',
  overlay: 'rgba(16, 19, 16, 0.38)',
  skeleton: '#EDEFEF',
  skeletonHighlight: '#F6F7F6',
} as const;

export const darkColors = {
  background: '#0F120F',
  surface: '#161A16',
  textPrimary: '#F0F3F0',
  textSecondary: '#A7B1AB',
  border: '#2A302B',
  accent: '#43D665',
  cta: '#F0F3F0',
  success: '#31BF62',
  warning: '#EEA63F',
  destructive: '#EF5A5F',
  overlay: 'rgba(0, 0, 0, 0.5)',
  skeleton: '#222A23',
  skeletonHighlight: '#2F3831',
} as const;

export type ColorPalette = typeof colors;
