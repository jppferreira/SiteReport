import { BlurView } from 'expo-blur';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
  type BottomTabNavigationOptions,
} from 'expo-router/js-tabs';
import React, { useContext, useEffect, useRef } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  makeMutable,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

import { isMotionReduced, useTheme } from '@/theme';

import { Text } from './Text';

/** Soft ease for the selected pill between tabs. */
const INDICATOR_TIMING = {
  duration: 320,
  easing: Easing.out(Easing.cubic),
};

const ICON_SIZE = 22;

/** How far the fade reaches above the pill, so content dissolves instead of hitting a hard edge. */
export const PILL_TAB_BAR_WASH_ABOVE = 72;

type TabFrame = { x: number; width: number };

/**
 * Module-level mutables so the selected-pill animation survives tab-bar remounts
 * when the navigator re-creates the custom `tabBar` on focus changes. Component
 * `useSharedValue` would reset to 0 and look like a snap.
 */
const indicatorX = makeMutable(0);
const indicatorWidth = makeMutable(0);
const indicatorReady = makeMutable(0);
const savedFrames: Record<string, TabFrame> = {};

/**
 * Floating capsule tab bar. The green selected pill eases between measured
 * tab frames on press and when the focused route changes.
 */
export function PillTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors, spacing, radius, shadows, scheme } = useTheme();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const frames = useRef(savedFrames);
  const dark = scheme === 'dark';

  const focusedRoute = state.routes[state.index];
  const focusedKey = focusedRoute?.key;

  const commit = (frame: TabFrame, animate: boolean) => {
    const canAnimate = animate && indicatorReady.value === 1 && indicatorWidth.value > 0 && !isMotionReduced();

    if (canAnimate) {
      indicatorX.value = withTiming(frame.x, INDICATOR_TIMING);
      indicatorWidth.value = withTiming(frame.width, INDICATOR_TIMING);
    } else {
      indicatorX.value = frame.x;
      indicatorWidth.value = frame.width;
    }
    indicatorReady.value = 1;
  };

  const moveToKey = (key: string | undefined, animate: boolean) => {
    if (!key) return;
    const frame = frames.current[key];
    if (!frame) return;
    commit(frame, animate);
  };

  useEffect(() => {
    moveToKey(focusedKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedKey]);

  const onTabLayout = (key: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    const next = { x, width };
    const previous = frames.current[key];
    frames.current[key] = next;
    savedFrames[key] = next;

    if (key !== focusedKey) return;
    if (previous && previous.x === next.x && previous.width === next.width) return;
    commit(next, indicatorReady.value === 1);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorReady.value,
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  const onBarLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(event.nativeEvent.layout.height);
  };

  return (
    <View
      testID="pill-tab-bar"
      onLayout={onBarLayout}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2,
        paddingTop: PILL_TAB_BAR_WASH_ABOVE,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        paddingHorizontal: Math.max(spacing.lg, insets.left, insets.right),
        pointerEvents: 'box-none',
      }}
    >
      <TabBarWash color={colors.background} />
      <View style={[styles.pillShadow, { borderRadius: radius.pill, pointerEvents: 'box-none' }, shadows.floating]}>
        <View
          accessibilityRole="tablist"
          style={[
            styles.pill,
            {
              borderColor: dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.66)',
              borderRadius: radius.pill,
              padding: spacing.xxs,
            },
          ]}
        >
          <BlurView
            intensity={dark ? 48 : 64}
            tint={dark ? 'dark' : 'default'}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.pill, pointerEvents: 'none' }]}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                // Main app background for the bar track — selected pill stays accent.
                backgroundColor: withAlpha(colors.background, dark ? 0.88 : 0.92),
                borderRadius: radius.pill,
                pointerEvents: 'none',
              },
            ]}
          />
          <Animated.View
            testID="pill-tab-indicator"
            style={[
              styles.indicator,
              {
                top: spacing.xxs,
                bottom: spacing.xxs,
                backgroundColor: colors.accent,
                borderRadius: radius.pill,
                pointerEvents: 'none',
              },
              indicatorStyle,
            ]}
          />
          {state.routes.map((route, index) => {
            const descriptor = descriptors[route.key];
            if (!descriptor) return null;
            const { options } = descriptor;
            if (isHidden(options)) return null;

            const focused = state.index === index;
            const color = focused ? colors.accentOnAccent : colors.textTertiary;
            const label = resolveLabel(options, route.name);

            const onPress = () => {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (focused || event.defaultPrevented) return;

              moveToKey(route.key, true);
              navigateToTab(route.key);
            };

            const onLongPress = () => {
              emitter.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                aria-selected={focused}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                testID={options.tabBarButtonTestID ?? `tab-${route.name}`}
                onPress={onPress}
                onLongPress={onLongPress}
                onLayout={(event) => onTabLayout(route.key, event)}
                style={({ pressed }) => [styles.tab, { borderRadius: radius.pill, opacity: pressed ? 0.72 : 1 }]}
              >
                {options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}
                {options.tabBarShowLabel === false ? null : (
                  <Text variant="caption" color={color} numberOfLines={1}>
                    {label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function TabBarWash({ color }: { color: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="tabBarWash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="0.34" stopColor={color} stopOpacity={0.35} />
            <Stop offset="0.68" stopColor={color} stopOpacity={0.82} />
            <Stop offset="1" stopColor={color} stopOpacity={0.96} />
          </LinearGradient>
          <LinearGradient id="tabBarTaper" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
            <Stop offset="0.08" stopColor="#ffffff" stopOpacity={1} />
            <Stop offset="0.92" stopColor="#ffffff" stopOpacity={1} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
          <Mask id="tabBarTaperMask" x="0" y="0" width="100%" height="100%">
            <Rect width="100%" height="100%" fill="url(#tabBarTaper)" />
          </Mask>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#tabBarWash)" mask="url(#tabBarTaperMask)" />
      </Svg>
    </View>
  );
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolveLabel(options: BottomTabNavigationOptions, routeName: string) {
  if (typeof options.tabBarLabel === 'string') return options.tabBarLabel;
  return options.title ?? routeName;
}

function isHidden(options: BottomTabNavigationOptions & { href?: string | null }) {
  if (options.href === null) return true;
  const style = StyleSheet.flatten(options.tabBarItemStyle);
  return style?.display === 'none';
}

const styles = StyleSheet.create({
  pillShadow: {
    overflow: 'visible',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  indicator: {
    position: 'absolute',
    left: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 60,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
});
