import { Stack } from 'expo-router';
import React from 'react';

export default function DocumentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="preview" />
      <Stack.Screen name="new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="customer-new" options={{ presentation: 'modal' }} />
    </Stack>
  );
}