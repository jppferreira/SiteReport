import '@expo/metro-runtime';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { AppStateProvider, useAppState } from '@/hooks/useAppState';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { ready, bootstrapError } = useAppState();

  if (!ready) {
    return <LoadingState label="Preparing SiteReport…" />;
  }

  if (bootstrapError) {
    return (
      <ErrorState
        title="We couldn't start SiteReport"
        description={bootstrapError}
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="jobs/new" options={{ title: 'Create job', presentation: 'modal' }} />
      <Stack.Screen name="jobs/[jobId]/index" options={{ title: 'Job' }} />
      <Stack.Screen name="jobs/[jobId]/photos" options={{ title: 'Photos' }} />
      <Stack.Screen name="jobs/[jobId]/summary" options={{ title: 'Work summary' }} />
      <Stack.Screen name="jobs/[jobId]/signature" options={{ title: 'Customer sign-off' }} />
      <Stack.Screen name="jobs/[jobId]/preview" options={{ title: 'Report preview' }} />
      <Stack.Screen name="settings/business-profile" options={{ title: 'Business profile' }} />
      <Stack.Screen name="settings/privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="paywall/index" options={{ presentation: 'modal', title: 'Upgrade to Pro' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <RootNavigator />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
