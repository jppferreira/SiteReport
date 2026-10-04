import type { ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

import { colors, radius } from '@/theme';

type Props = {
  onSave: (dataUrl: string) => void;
  onEmpty?: () => void;
  refInstance?: (instance: ComponentRef<typeof SignatureScreen> | null) => void;
};

export function SignaturePad({ onSave, onEmpty, refInstance }: Props) {
  return (
    <View style={styles.wrap}>
      <SignatureScreen
        onOK={onSave}
        onEmpty={onEmpty}
        autoClear={false}
        descriptionText=""
        webStyle={`
          .m-signature-pad {
            box-shadow: none;
            border: none;
          }
          .m-signature-pad--footer {
            display: none;
          }
          body,html {
            background: #fff;
          }
        `}
        ref={refInstance}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.large,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 220,
    backgroundColor: colors.surface,
  },
});
