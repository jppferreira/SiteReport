import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureScreen from 'react-native-signature-canvas';

import { AppText } from '@/components/core/AppText';
import { Button } from '@/components/core/Button';
import { Input } from '@/components/core/Input';
import { SignaturePad } from '@/components/signature/SignaturePad';
import { databaseService } from '@/services/databaseService';
import { fileService } from '@/services/fileService';
import { nowIso } from '@/utils/date';
import { colors, spacing } from '@/theme';

export default function SignatureScreenRoute() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const signatureRef = useRef<ComponentRef<typeof SignatureScreen> | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [savedSignatureUri, setSavedSignatureUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    const signature = await databaseService.getSignature(jobId);
    setCustomerName(signature?.customerName ?? '');
    setSavedSignatureUri(signature?.localSignatureUri ?? null);
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const save = async (dataUrl: string) => {
    if (!jobId) return;
    setSaving(true);
    const uri = await fileService.saveSignatureFromDataUrl(jobId, dataUrl);
    const previous = await databaseService.getSignature(jobId);
    if (previous?.localSignatureUri) {
      await fileService.deleteUri(previous.localSignatureUri);
    }
    await databaseService.upsertSignature(jobId, {
      customerName: customerName.trim() || null,
      localSignatureUri: uri,
      signedAt: nowIso(),
    });
    await databaseService.markReportsStale(jobId);
    setSavedSignatureUri(uri);
    setSaving(false);
  };

  const clear = async () => {
    if (!jobId) return;
    signatureRef.current?.clearSignature?.();
    const deletedUri = await databaseService.deleteSignature(jobId);
    await fileService.deleteUri(deletedUri);
    await databaseService.markReportsStale(jobId);
    setSavedSignatureUri(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h2">Customer sign-off</AppText>
        <AppText variant="bodySmall" color={colors.textSecondary}>
          The signature confirms acknowledgement of the completed work and report.
        </AppText>
        <Input label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Optional" />
        <SignaturePad onSave={(dataUrl) => void save(dataUrl)} refInstance={(instance) => (signatureRef.current = instance)} />
        <View style={styles.row}>
          <Button label="Save signature" onPress={() => signatureRef.current?.readSignature()} loading={saving} />
          <Button label="Clear" variant="secondary" onPress={() => void clear()} />
        </View>
        {savedSignatureUri ? (
          <View style={styles.previewWrap}>
            <AppText variant="caption" color={colors.textSecondary}>
              Saved signature preview
            </AppText>
            <Image source={{ uri: savedSignatureUri }} style={styles.preview} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.x5,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  previewWrap: {
    gap: spacing.xs,
  },
  preview: {
    width: '100%',
    height: 110,
    resizeMode: 'contain',
    backgroundColor: colors.surface,
  },
});
