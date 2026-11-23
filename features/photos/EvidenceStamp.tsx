import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';

type EvidenceStampProps = {
  dateTimeLabel?: string | null;
  addressLabel?: string | null;
  verified?: boolean;
};

/** Dark frosted stamp overlaid on a photo (Figma Field Proof · 06). */
export function EvidenceStamp({ dateTimeLabel, addressLabel, verified = true }: EvidenceStampProps) {
  if (!dateTimeLabel && !addressLabel) return null;

  return (
    <View style={styles.stamp}>
      {dateTimeLabel ? (
        <View style={styles.row}>
          <Ionicons name="time-outline" size={13} color="#FFFFFF" />
          <Text variant="caption" color="#FFFFFF" style={styles.primary}>
            {dateTimeLabel}
          </Text>
        </View>
      ) : null}
      {addressLabel ? (
        <View style={styles.row}>
          <Ionicons name="location-outline" size={13} color="#E8ECE9" />
          <Text variant="caption" color="#E8ECE9" style={styles.secondary} numberOfLines={2}>
            {addressLabel}
          </Text>
        </View>
      ) : null}
      {verified ? (
        <View style={styles.row}>
          <Ionicons name="shield-checkmark" size={13} color="#7BE8A4" />
          <Text variant="caption" color="#7BE8A4" style={styles.primary}>
            Verified on device
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    maxWidth: '88%',
    gap: 4,
    paddingLeft: 11,
    paddingRight: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(16,19,16,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  primary: {
    fontSize: 12,
    fontWeight: '600',
  },
  secondary: {
    fontSize: 11.5,
    fontWeight: '500',
    flexShrink: 1,
  },
});
