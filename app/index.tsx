import { Redirect } from 'expo-router';

import { LoadingState } from '@/components/feedback/LoadingState';
import { useAppState } from '@/hooks/useAppState';

export default function RootIndex() {
  const { ready, preferences } = useAppState();

  if (!ready) {
    return <LoadingState label="Loading…" />;
  }

  if (!preferences.onboardingCompleted) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)/jobs" />;
}
