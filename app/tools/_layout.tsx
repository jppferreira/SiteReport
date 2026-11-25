import { Stack } from 'expo-router';
import React from 'react';

export default function ToolsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="level" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
    </Stack>
  );
}
