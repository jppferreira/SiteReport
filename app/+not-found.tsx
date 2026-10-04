import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/core/AppText';
import { colors, spacing } from '@/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <SafeAreaView style={styles.container}>
        <AppText variant="h2">This screen does not exist.</AppText>

        <Link href="/" style={styles.link}>
          <AppText variant="bodySmall" color={colors.accent}>
            Go to home screen
          </AppText>
        </Link>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenHorizontal,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  link: {
    paddingVertical: spacing.sm,
  },
});
