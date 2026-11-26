import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motionSpring, motionTiming, useTheme } from '@/theme';

import { Text } from './Text';

export type FloatingActionButtonAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Mini-FAB fill. Defaults to elevated surface. */
  backgroundColor?: string;
  /** Icon tint. Defaults to near-black ink (for pastel fills). */
  iconColor?: string;
  accessibilityLabel?: string;
  onPress: () => void;
};

type FloatingActionButtonProps = {
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** When set, renders the Figma-style pill FAB (+ New) instead of a round icon-only button. */
  label?: string;
  accessibilityLabel: string;
  /** Google Keep–style speed dial. When set, the main FAB toggles these actions. */
  actions?: FloatingActionButtonAction[];
};

const ACTION_STEP = 72;
const ACTION_SIZE = 52;
const MAIN_SIZE = 56;
/** High-contrast ink on pastel mini-FABs (pastels stay light in both schemes). */
const ACTION_INK = '#121412';

const FAN_SPRING = { damping: 14, stiffness: 180, mass: 0.7 };

export function FloatingActionButton({
  onPress,
  icon = 'add',
  label,
  accessibilityLabel,
  actions,
}: FloatingActionButtonProps) {
  const { colors, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const withLabel = Boolean(label) && !actions?.length;
  const hasActions = Boolean(actions && actions.length > 0);
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = open
      ? motionSpring(1, FAN_SPRING)
      : motionTiming(0, { duration: 160 });
  }, [open, progress]);

  const bottom = insets.bottom + 84;

  const toggle = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hasActions) {
      setOpen((prev) => !prev);
      return;
    }
    onPress?.();
  };

  const close = () => setOpen(false);

  const runAction = (action: FloatingActionButtonAction) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(false);
    action.onPress();
  };

  const mainIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hasActions ? (
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[styles.overlay, { backgroundColor: colors.overlay }, overlayStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
          />
        </Animated.View>
      ) : null}

      {hasActions
        ? actions!.map((action, index) => {
            // Closest to the main FAB first (bottom of the stack).
            const fromBottom = actions!.length - 1 - index;
            return (
              <SpeedDialAction
                key={action.key}
                action={action}
                index={fromBottom}
                count={actions!.length}
                open={open}
                progress={progress}
                bottom={bottom}
                onPress={() => runAction(action)}
              />
            );
          })
        : null}

      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={hasActions ? { expanded: open } : undefined}
        style={({ pressed }) => [
          withLabel ? styles.pill : styles.base,
          {
            bottom,
            backgroundColor: open ? colors.ctaDarkPressed : colors.ctaDark,
            borderRadius: radius.pill,
            opacity: pressed ? 0.9 : 1,
            zIndex: 3,
          },
          shadows.floating,
        ]}
      >
        <Animated.View style={mainIconStyle}>
          <Ionicons name={icon} size={withLabel ? 20 : 26} color={colors.textInverse} />
        </Animated.View>
        {label && withLabel ? (
          <Text variant="bodyMedium" color={colors.textInverse} style={styles.label}>
            {label}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

function SpeedDialAction({
  action,
  index,
  count,
  open,
  progress,
  bottom,
  onPress,
}: {
  action: FloatingActionButtonAction;
  index: number;
  count: number;
  open: boolean;
  progress: SharedValue<number>;
  bottom: number;
  onPress: () => void;
}) {
  const { colors, shadows } = useTheme();
  const travel = (index + 1) * ACTION_STEP;
  // Fan slightly left as items rise — Google Keep–style spread.
  const fanX = -6 - index * 4;
  const stagger = index * 0.07;
  const fill = action.backgroundColor ?? colors.backgroundElevated;
  const ink = action.iconColor ?? ACTION_INK;

  const rowStyle = useAnimatedStyle(() => {
    // Staggered local progress so each chip fans out after the one below it.
    const local = Math.max(
      0,
      Math.min(1, (progress.value - stagger) / Math.max(0.001, 1 - stagger * (count - 1 || 1)))
    );
    return {
      opacity: interpolate(local, [0, 0.2, 1], [0, 1, 1], Extrapolation.CLAMP),
      transform: [
        // Closed: sit on the main FAB. Open: settle into the stacked slot above.
        { translateY: interpolate(local, [0, 1], [travel, 0], Extrapolation.CLAMP) },
        { translateX: interpolate(local, [0, 1], [8, fanX], Extrapolation.CLAMP) },
        { scale: interpolate(local, [0, 1], [0.15, 1], Extrapolation.CLAMP) },
        {
          rotate: `${interpolate(local, [0, 1], [22 - index * 5, 0], Extrapolation.CLAMP)}deg`,
        },
      ],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const local = Math.max(
      0,
      Math.min(1, (progress.value - stagger - 0.05) / Math.max(0.001, 1 - stagger))
    );
    return {
      opacity: interpolate(local, [0, 0.45, 1], [0, 0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(local, [0, 1], [14, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[
        styles.actionRow,
        {
          // Final resting slot above the main FAB; translateY animates out from it.
          bottom: bottom + travel,
          zIndex: 2,
        },
        rowStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={action.accessibilityLabel ?? action.label}
        style={({ pressed }) => [styles.actionHit, { opacity: pressed ? 0.88 : 1 }]}
      >
        <Animated.View
          style={[
            styles.actionLabel,
            {
              backgroundColor: colors.backgroundElevated, // Speed-dial action label surface
              borderColor: colors.border,
            },
            shadows.floating,
            labelStyle,
          ]}
        >
          <Text variant="bodyMedium" color={colors.textPrimary} style={styles.actionLabelText}>
            {action.label}
          </Text>
        </Animated.View>
        <View
          style={[
            styles.actionFab,
            {
              backgroundColor: fill,
              borderColor: colors.border,
            },
            shadows.floating,
          ]}
        >
          <Ionicons name={action.icon} size={24} color={ink} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  base: {
    position: 'absolute',
    right: 20,
    width: MAIN_SIZE,
    height: MAIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    right: 20,
    height: MAIN_SIZE,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 16,
  },
  actionRow: {
    position: 'absolute',
    right: 20 + (MAIN_SIZE - ACTION_SIZE) / 2,
    alignItems: 'flex-end',
  },
  actionHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionLabel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabelText: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 15,
  },
  actionFab: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
