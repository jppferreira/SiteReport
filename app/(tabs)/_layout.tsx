import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React, { useCallback } from 'react';

import { PillTabBar } from '@/components/PillTabBar';
import { useI18n } from '@/i18n/useI18n';

export default function TabsLayout() {
  const { t } = useI18n();
  const renderTabBar = useCallback((props: BottomTabBarProps) => <PillTabBar {...props} />, []);

  return (
    <Tabs tabBar={renderTabBar} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="jobs"
        options={{
          title: t('tabs.jobs'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={22} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          // Merged into Jobs; kept as a redirect for deep links.
          href: null,
          title: t('tabs.documents'),
        }}
      />
      <Tabs.Screen
        name="toolbox"
        options={{
          title: t('tabs.toolbox'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'construct' : 'construct-outline'} size={22} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          // Reachable from Jobs top-right (My Account); kept out of the pill bar.
          href: null,
          title: t('settings.title'),
        }}
      />
    </Tabs>
  );
}
