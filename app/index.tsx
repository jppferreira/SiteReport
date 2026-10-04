import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { LoadingState } from '@/components';
import { hasCompletedOnboarding } from '@/services/preferencesService';

export default function Index() {
  const [status, setStatus] = useState<'loading' | 'onboarding' | 'app'>('loading');

  useEffect(() => {
    hasCompletedOnboarding().then((complete) => setStatus(complete ? 'app' : 'onboarding'));
  }, []);

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/jobs" />;
}
