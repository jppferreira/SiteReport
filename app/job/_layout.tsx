import { Stack } from 'expo-router';
import React from 'react';

export default function JobLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[id]/photos/index" />
      <Stack.Screen name="[id]/photos/[areaId]" />
      <Stack.Screen name="[id]/photo/[photoId]" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="[id]/summary" />
      <Stack.Screen name="[id]/signature" options={{ gestureEnabled: false }} />
      <Stack.Screen name="[id]/preview" />
      <Stack.Screen name="[id]/generate" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
