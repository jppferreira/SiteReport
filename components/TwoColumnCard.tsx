import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useTheme } from '@/theme';
import { getLayoutTokens } from '@/theme/layoutTokens';

type TwoColumnCardProps = {
  /** Left column content. */
  left: ReactNode;
  /** Right column content. */
  right: ReactNode;
  /** Optional testID. */
  testID?: string;
};

/**
 * Two-column card layout for iPad landscape paywall. In portrait or on phone,
 * stacks vertically.
 *
 * Used for: Paywall in landscape.
 */
export function TwoColumnCard({ left, right, testID }: TwoColumnCardProps) {
  const { spacing } = useTheme();
  const breakpoint = useTabletBreakpoint();
  const layout = getLayoutTokens(breakpoint);

  const shouldStack = !breakpoint.isTablet || !breakpoint.isLandscape;

  if (shouldStack) {
    // Phone or iPad portrait: stack vertically
    return (
      <View testID={testID} style={{ flex: 1, gap: spacing.xl }}>
        {left}
        {right}
      </View>
    );
  }

  // iPad landscape: two columns
  return (
    <View testID={testID} style={[styles.row, { gap: layout.panePadding }]}>
      <View style={styles.column}>{left}</View>
      <View style={styles.column}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flex: 1,
  },
  column: {
    flex: 1,
  },
});
