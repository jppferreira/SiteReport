import React, { useMemo } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { crewAvatarLayerSources, type CrewAvatarComposition } from '@/models';

type CrewAvatarProps = {
  composition: CrewAvatarComposition;
  size?: number;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
};

/** Circular DIY crew headshot — locked-plate layers on a solid bg colour. */
export function CrewAvatar({ composition, size = 44, style, borderColor }: CrewAvatarProps) {
  const radius = size / 2;
  const layers = useMemo(() => crewAvatarLayerSources(composition), [composition]);

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: composition.backgroundColor,
          borderColor: borderColor ?? 'transparent',
          borderWidth: borderColor ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      {layers.map((source, index) => (
        <Image
          key={index}
          source={source}
          style={[styles.layer, { width: size, height: size }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
