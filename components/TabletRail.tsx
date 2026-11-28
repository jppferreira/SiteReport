import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { getLayoutTokens } from '@/theme/layoutTokens';

import { Text } from './Text';

type RailItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  route: string;
};

/**
 * Leading rail/sidebar navigation for iPad. Replaces the PillTabBar on tablet
 * devices. Shows icon-only at 11″ portrait (80pt) and icons with labels at
 * 12.9″+ (88pt).
 *
 * Items: Jobs, Toolbox, My Account (Settings).
 */
export function TabletRail() {
  const { t } = useI18n();
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const breakpoint = useTabletBreakpoint();
  const layout = getLayoutTokens(breakpoint);

  const items: RailItem[] = [
    {
      key: 'jobs',
      label: t('tabs.jobs'),
      icon: 'briefcase-outline',
      iconFocused: 'briefcase',
      route: '/(tabs)/jobs',
    },
    {
      key: 'toolbox',
      label: t('tabs.toolbox'),
      icon: 'construct-outline',
      iconFocused: 'construct',
      route: '/(tabs)/toolbox',
    },
    {
      key: 'settings',
      label: t('settings.title'),
      icon: 'person-circle-outline',
      iconFocused: 'person-circle',
      route: '/(tabs)/settings',
    },
  ];

  // Determine which item is focused based on the current route.
  // For settings, check both /(tabs)/settings and /settings paths.
  const focusedKey = (() => {
    if (pathname.startsWith('/(tabs)/jobs') || pathname === '/') return 'jobs';
    if (pathname.startsWith('/(tabs)/toolbox') || pathname.startsWith('/tools')) return 'toolbox';
    if (pathname.startsWith('/(tabs)/settings') || pathname.startsWith('/settings')) return 'settings';
    // Check segments for nested routes
    if (segments[0] === '(tabs)' && segments[1] === 'jobs') return 'jobs';
    if (segments[0] === '(tabs)' && segments[1] === 'toolbox') return 'toolbox';
    if (segments[0] === '(tabs)' && segments[1] === 'settings') return 'settings';
    if (segments[0] === 'settings') return 'settings';
    if (segments[0] === 'job' || segments[0] === 'document') return 'jobs';
    return 'jobs'; // Default to jobs
  })();

  const showLabels = !breakpoint.isCompact || breakpoint.isLandscape;
  const railWidth = layout.rail;

  return (
    <View
      style={[
        styles.rail,
        {
          width: railWidth,
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
          paddingTop: Math.max(spacing.md, insets.top),
          paddingBottom: Math.max(spacing.md, insets.bottom),
        },
      ]}
    >
      <View style={styles.itemsContainer}>
        {items.map((item) => {
          const focused = focusedKey === item.key;
          const iconName = focused ? item.iconFocused : item.icon;
          const textColor = focused ? colors.accent : colors.textSecondary;
          const bgColor = focused ? colors.accentSoft : 'transparent';

          const handlePress = () => {
            if (item.route) {
              router.push(item.route as any);
            }
          };

          return (
            <Pressable
              key={item.key}
              onPress={handlePress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: bgColor,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: showLabels ? spacing.sm : spacing.xs,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name={iconName} size={24} color={textColor} />
              {showLabels ? (
                <Text
                  variant="caption"
                  color={textColor}
                  numberOfLines={1}
                  style={{ marginTop: spacing.xxs }}
                >
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    borderRightWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 10,
      },
      default: {
        // On native, the rail is part of the flex layout
      },
    }),
  },
  itemsContainer: {
    gap: 8,
    paddingHorizontal: 8,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
});
