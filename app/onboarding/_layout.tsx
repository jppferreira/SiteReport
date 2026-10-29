import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '@/theme';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ gestureEnabled: false, animation: 'none' }} />
      <Stack.Screen name="capture" options={{ animation: 'none' }} />
      <Stack.Screen name="document" options={{ animation: 'none' }} />
      <Stack.Screen name="share" options={{ animation: 'none' }} />
      <Stack.Screen name="privacy" options={{ animation: 'none' }} />
      <Stack.Screen name="profile" options={{ animation: 'fade' }} />
    </Stack>
  );
}
