import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  useFonts,
} from '@expo-google-fonts/lexend';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, LogBox, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** Keep store / marketing screenshots free of the Expo “Open debugger…” toast. */
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

import { ToastProvider, ErrorState } from '@/components';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { getDatabase } from '@/database';
import { IcloudAutoBackupHost } from '@/features/backup/IcloudAutoBackupHost';
import { DocumentRemindersHost } from '@/features/notifications/DocumentRemindersHost';
import { LaunchSplash } from '@/features/splash/LaunchSplash';
import { loadStoredLocale } from '@/i18n/localePreference';
import { useI18n } from '@/i18n/useI18n';
import { refreshEntitlement } from '@/services/entitlementService';
import { repairStaleSitereportUris } from '@/services/storagePathRepair';
import { ThemeProvider } from '@/theme';
import { logger } from '@/utils/logger';

/** Expo Go for SDK 58 is still rolling out — Trade Report needs its own native binary. */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

/** Keep the branded splash on screen long enough to read. */
const MIN_SPLASH_MS = 4000;

/**
 * When onboarding (or a deep link) opens /job/new as a modal, keep the tabs
 * stack underneath so Cancel / dismiss has somewhere to land.
 */
export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { t, setLocale } = useI18n();
  const [fontsLoaded, fontError] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });
  const [dbState, setDbState] = useState<'loading' | 'ready' | 'failed' | 'expo-go'>(
    isExpoGo ? 'expo-go' : 'loading'
  );
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
    if (isExpoGo) return;
    let cancelled = false;
    getDatabase()
      .then(async () => {
        try {
          await repairStaleSitereportUris();
        } catch (error) {
          logger.warn('Sitereport path repair skipped', { error: String(error) });
        }
        if (!cancelled) setDbState('ready');
      })
      .catch((error) => {
        logger.error('Failed to initialize database', error);
        const message = error instanceof Error ? error.message : String(error);
        if (!cancelled) {
          setDbState(/ExpoSQLite|Expo Go|development build/i.test(message) ? 'expo-go' : 'failed');
        }
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
            {appReady && dbState === 'expo-go' ? (
              <ErrorState title={t('root.expoGoTitle')} description={t('root.expoGoDescription')} />
            ) : null}
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
                  <Stack.Screen name="document" />
                  <Stack.Screen name="tools" />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
                </Stack>
              </AppErrorBoundary>
            ) : null}
            {appReady && dbState === 'ready' && !splashHold ? <DocumentRemindersHost /> : null}
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
