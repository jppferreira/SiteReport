import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  useFonts,
} from '@expo-google-fonts/lexend';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider, ErrorState } from '@/components';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { getDatabase } from '@/database';
import { IcloudAutoBackupHost } from '@/features/backup/IcloudAutoBackupHost';
import { LaunchSplash } from '@/features/splash/LaunchSplash';
import { loadStoredLocale } from '@/i18n/localePreference';
import { useI18n } from '@/i18n/useI18n';
import { refreshEntitlement } from '@/services/entitlementService';
import { ThemeProvider } from '@/theme';
import { logger } from '@/utils/logger';

/** Keep the branded splash on screen long enough to read. */
const MIN_SPLASH_MS = 4000;

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { t, setLocale } = useI18n();
  const [fontsLoaded, fontError] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });
  const [dbState, setDbState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [dbAttempt, setDbAttempt] = useState(0);
  const [localeReady, setLocaleReady] = useState(false);
  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  const [splashPainted, setSplashPainted] = useState(false);
  const [splashHold, setSplashHold] = useState(true);
  const [splashMounted, setSplashMounted] = useState(true);
  const paintedAt = useRef(0);
  const [splashOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let cancelled = false;
    loadStoredLocale()
      .then((stored) => {
        if (!cancelled && stored) setLocale(stored);
      })
      .finally(() => {
        if (!cancelled) setLocaleReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setLocale]);

  useEffect(() => {
    const timeout = setTimeout(() => setFontWaitExpired(true), 3000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (fontError) {
      logger.warn('Fonts unavailable, continuing with system fonts', { error: String(fontError) });
    }
  }, [fontError]);

  useEffect(() => {
    let cancelled = false;
    getDatabase()
      .then(() => {
        if (!cancelled) setDbState('ready');
      })
      .catch((error) => {
        logger.error('Failed to initialize database', error);
        if (!cancelled) setDbState('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [dbAttempt]);

  useEffect(() => {
    refreshEntitlement().catch(() => undefined);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshEntitlement().catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);

  // Font files ship with the app. A failed or stalled load must not leave
  // the native splash up when the device is offline.
  const visualsReady = fontsLoaded || fontError != null || fontWaitExpired;
  const appReady = dbState !== 'loading' && visualsReady && localeReady;

  useEffect(() => {
    if (!appReady || !splashPainted) return;
    const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - paintedAt.current));
    const timeout = setTimeout(() => setSplashHold(false), wait);
    return () => clearTimeout(timeout);
  }, [appReady, splashPainted]);

  useEffect(() => {
    if (splashHold) return;
    const animation = Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 320,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start(({ finished }) => {
      if (finished) setSplashMounted(false);
    });
    return () => animation.stop();
  }, [splashHold, splashOpacity]);

  if (!visualsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            {appReady && dbState === 'failed' ? (
              <ErrorState
                title={t('root.dbErrorTitle')}
                description={t('root.dbErrorDescription')}
                onAction={() => {
                  setDbState('loading');
                  setDbAttempt((attempt) => attempt + 1);
                }}
              />
            ) : null}
            {appReady && dbState === 'ready' ? (
              <AppErrorBoundary>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="job" />
                  <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
                </Stack>
              </AppErrorBoundary>
            ) : null}
            {appReady && dbState === 'ready' && !splashHold && Platform.OS === 'ios' ? (
              <IcloudAutoBackupHost />
            ) : null}
            {splashMounted ? (
              <Animated.View
                style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}
                pointerEvents={splashHold ? 'auto' : 'none'}
                onLayout={() => {
                  if (splashPainted) return;
                  paintedAt.current = Date.now();
                  setSplashPainted(true);
                  SplashScreen.hideAsync().catch(() => undefined);
                }}
              >
                <LaunchSplash />
              </Animated.View>
            ) : null}
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
