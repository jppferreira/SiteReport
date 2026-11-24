import { Image, type ImageSource } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ReportTemplateId } from '@/models';

/** Real cover previews for every layout in the template tray. */
const COVER_THUMBS: Record<ReportTemplateId, ImageSource> = {
  trade: require('../../assets/images/template-thumbs/trade.jpg'),
  modern: require('../../assets/images/template-thumbs/modern.jpg'),
  image: require('../../assets/images/template-thumbs/image.jpg'),
  side: require('../../assets/images/template-thumbs/side.jpg'),
  cards: require('../../assets/images/template-thumbs/cards.jpg'),
  minimal: require('../../assets/images/template-thumbs/minimal.jpg'),
  dark: require('../../assets/images/template-thumbs/dark.jpg'),
  thermal: require('../../assets/images/template-thumbs/thermal.jpg'),
  circuit: require('../../assets/images/template-thumbs/circuit.jpg'),
  studio: require('../../assets/images/template-thumbs/studio.jpg'),
  field: require('../../assets/images/template-thumbs/field.jpg'),
  atelier: require('../../assets/images/template-thumbs/atelier.jpg'),
  botanical: require('../../assets/images/template-thumbs/botanical.jpg'),
  stone: require('../../assets/images/template-thumbs/stone.jpg'),
  solaris: require('../../assets/images/template-thumbs/solaris.jpg'),
  blueprint: require('../../assets/images/template-thumbs/blueprint.jpg'),
  clearline: require('../../assets/images/template-thumbs/clearline.jpg'),
  sentinel: require('../../assets/images/template-thumbs/sentinel.jpg'),
};

type LayoutThumbProps = {
  template: ReportTemplateId;
  /** Kept for call-site compatibility; cover images already include branding colour. */
  accent?: string;
};

/** Full-page cover image for the template picker — no wireframe ghosts. */
export function LayoutThumb({ template }: LayoutThumbProps) {
  return (
    <View style={styles.page}>
      <Image source={COVER_THUMBS[template]} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    aspectRatio: 1 / 1.28,
    backgroundColor: '#EEF0EE',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3E6E3',
  },
});
