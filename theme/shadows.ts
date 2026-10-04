import { Platform } from 'react-native';

export const shadows = {
  subtle: Platform.select({
    ios: {
      shadowColor: '#101310',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: {
      elevation: 1,
    },
    default: {},
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#101310',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
};
