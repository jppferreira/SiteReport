import React from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

type ModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  dismissOnBackdropPress?: boolean;
};

export function Modal({ visible, onRequestClose, children, dismissOnBackdropPress = true }: ModalProps) {
  const { colors, spacing } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={dismissOnBackdropPress ? onRequestClose : undefined}
      >
        <Pressable onPress={() => undefined} style={{ width: '100%', paddingHorizontal: spacing.lg }}>
          <View>{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
