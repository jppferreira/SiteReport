import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTabletBreakpoint } from '@/hooks/useTabletBreakpoint';
import { useTheme } from '@/theme';
import { getLayoutTokens } from '@/theme/layoutTokens';

type CenteredCardProps = {
  /** Content to center. */
  children: ReactNode;
  /** Max width override. Defaults to contentMaxWidth from layout tokens. */
  maxWidth?: number;
  /** Optional testID. */
  testID?: string;
};

/**
 * Centers content on iPad within a max-width container. On phone,
 * content fills the available width.
 *
 * Used for: Onboarding, Paywall (portrait), Client Signature, Centered forms.
 */
export function CenteredCard({ children, maxWidth, testID }: CenteredCardProps) {
  const { spacing } = useTheme();
  const breakpoint = useTabletBreakpoint();
  const layout = getLayoutTokens(breakpoint);

  const maxW = maxWidth ?? layout.contentMaxWidth;

  if (!breakpoint.isTablet) {
    // Phone: fill width with standard padding
    return (
      <View testID={testID} style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {children}
      </View>
    );
  }

  // iPad: center with max width
  return (
    <View testID={testID} style={styles.container}>
      <View
        style={[
          styles.card,
          {
            maxWidth: maxW,
            paddingHorizontal: layout.panePadding,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
  },
});
