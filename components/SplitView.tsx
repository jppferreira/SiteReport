import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useTheme } from '@/theme';
import { getLayoutTokens } from '@/theme/layoutTokens';

type SplitViewProps = {
  /** Left pane: typically a list or navigation. */
  list: ReactNode;
  /** Right pane: detail view. */
  detail: ReactNode;
  /** Optional testID for testing. */
  testID?: string;
};

/**
 * Split view layout for iPad. Renders list + detail side by side with the
 * list column width from layout tokens. On phone (or when isTablet is false),
 * this component should not be used; phone screens show list or detail as full-screen.
 */
export function SplitView({ list, detail, testID }: SplitViewProps) {
  const { colors } = useTheme();
  const breakpoint = useTabletBreakpoint();
  const layout = getLayoutTokens(breakpoint);

  return (
    <View testID={testID} style={styles.container}>
      <View
        style={[
          styles.listPane,
          {
            width: layout.listColumn,
            borderRightWidth: StyleSheet.hairlineWidth,
            borderRightColor: colors.border,
          },
        ]}
      >
        {list}
      </View>
      <View style={styles.detailPane}>{detail}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  listPane: {
    flexShrink: 0,
  },
  detailPane: {
    flex: 1,
  },
});
