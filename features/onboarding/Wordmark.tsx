import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useTheme } from '@/theme';

import { BrandMark } from './BrandMark';

type WordmarkProps = {
  size?: 'header' | 'hero';
};

export function Wordmark({ size = 'header' }: WordmarkProps) {
  const { colors } = useTheme();
  const hero = size === 'hero';

  return (
    <View style={[styles.row, hero && styles.hero]}>
      <BrandMark size={hero ? 84 : 34} />
      <View style={styles.name}>
        <Text variant={hero ? 'h1' : 'h2'}>Trade</Text>
        <Text variant={hero ? 'h1' : 'h2'} color={colors.accent}>
          {' '}
          Report
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hero: {
    flexDirection: 'column',
    gap: 16,
  },
  name: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
