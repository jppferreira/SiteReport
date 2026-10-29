import { BlurView } from 'expo-blur';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
  type BottomTabNavigationOptions,
} from 'expo-router/js-tabs';
import React, { useContext, useEffect, useRef } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

import { motionTiming, useTheme } from '@/theme';

import { Text } from './Text';

const INDICATOR_TIMING = {
  duration: 280,
  easing: Easing.out(Easing.cubic),
};

const ICON_SIZE = 22;

/** How far the fade reaches above the pill, so content dissolves instead of hitting a hard edge. */
const WASH_ABOVE = 72;

type TabFrame = {
  x: number;
  width: number;
};

/**
 * Floating capsule tab bar. The active pill is positioned from each tab's
 * measured frame and moved with Reanimated timing so the slide runs on the
 * UI thread. `motionTiming` collapses that timing when Reduce Motion is on.
 *
 * The bar floats over the screen. A radial wash tapers out toward the edges
 * so the bottom of the page dissolves instead of ending on a solid plate,
 * and the capsule itself is a pastel frosted blur.
 */
export function PillTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors, spacing, radius, shadows } = useTheme();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const frames = useRef<Record<string, TabFrame>>({});
  const positioned = useRef(false);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorReady = useSharedValue(0);

  const focusedRoute = state.routes[state.index];
  const focusedKey = focusedRoute?.key;

  const placeIndicator = (frame: TabFrame, animate: boolean) => {
    if (animate) {
      indicatorX.value = motionTiming(frame.x, INDICATOR_TIMING);
      indicatorWidth.value = motionTiming(frame.width, INDICATOR_TIMING);
    } else {
      indicatorX.value = frame.x;
      indicatorWidth.value = frame.width;
    }
    indicatorReady.value = 1;
    positioned.current = true;
  };

  useEffect(() => {
    if (!focusedKey) return;
    const frame = frames.current[focusedKey];
    if (!frame) return;
    placeIndicator(frame, positioned.current);
    // Shared values are stable; the indicator should only retarget when the focused tab changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedKey]);

  const onTabLayout = (key: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    const next = { x, width };
    const previous = frames.current[key];
    frames.current[key] = next;
    if (key !== focusedKey) return;
    if (previous && previous.x === next.x && previous.width === next.width) return;
    // First measurement snaps into place. Later frame changes (rotation) follow the same timing.
    placeIndicator(next, positioned.current);
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
        paddingTop: WASH_ABOVE,
        paddingBottom: insets.bottom + spacing.xxl,
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
              borderColor: 'rgba(255, 255, 255, 0.66)',
              borderRadius: radius.pill,
              padding: spacing.xxs,
            },
          ]}
        >
          <BlurView
            intensity={64}
            tint="default"
            style={[StyleSheet.absoluteFill, { borderRadius: radius.pill, pointerEvents: 'none' }]}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: withAlpha(colors.accentSoft, 0.55),
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
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
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

function isHidden(options: BottomTabNavigationOptions) {
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
