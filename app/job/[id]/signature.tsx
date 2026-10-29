import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';

import { Button, Input, NavigationHeader, Screen, StatusBadge, Text, TextButton, useToast } from '@/components';
import { signatureRepository } from '@/database';
import { SignatureCanvas, SignatureCanvasHandle } from '@/features/signature/SignatureCanvas';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useSignature } from '@/hooks/useSignature';
import { useI18n } from '@/i18n/useI18n';
import { writeTextFile, deleteFileSafely, jobDirectory } from '@/services/fileService';
import { useTheme } from '@/theme';
import { goBack } from '@/utils/goBack';

export default function SignatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { signature, loading, refresh } = useSignature(id);
  const { isPro } = useEntitlement();
  const { showToast } = useToast();
  const canvasRef = useRef<SignatureCanvasHandle>(null);
  const [customerName, setCustomerName] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const nameSeeded = useRef(false);

  useEffect(() => {
    nameSeeded.current = false;
  }, [id]);

  useEffect(() => {
    if (nameSeeded.current || !signature || signature.jobId !== id) return;
    nameSeeded.current = true;
    setCustomerName(signature.customerName ?? '');
  }, [signature, id]);

  const handleClear = () => {
    canvasRef.current?.clear();
  };

  const handleSave = async () => {
    const handle = canvasRef.current;
    if (!handle || handle.isEmpty()) {
      showToast({ message: t('signature.toastDrawFirst'), tone: 'warning' });
      return;
    }
    if (!isPro) {
      router.push({ pathname: '/paywall', params: { trigger: 'signature' } });
      return;
    }
    setSaving(true);
    try {
      const svg = handle.exportSvg();
      const path = `${jobDirectory(id)}signature.svg`;
      await writeTextFile(path, svg);
      await signatureRepository.saveSignature({
        jobId: id,
        customerName: customerName.trim() || null,
        localSignatureUri: path,
        width: 0,
        height: 220,
        signedAt: new Date().toISOString(),
      });
      showToast({ message: t('signature.toastSaved'), tone: 'success' });
      refresh();
      goBack(`/job/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSignature = async () => {
    if (!signature) return;
    await deleteFileSafely(signature.localSignatureUri);
    await signatureRepository.deleteSignature(id);
    setCanvasKey((k) => k + 1);
    refresh();
    showToast({ message: t('signature.toastRemoved'), tone: 'neutral' });
  };

  if (loading) {
    return (
      <Screen>
        <NavigationHeader title={t('signature.title')} onBack={() => goBack(`/job/${id}`)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader
        title={t('signature.title')}
        onBack={() => goBack(`/job/${id}`)}
        right={<TextButton label={t('signature.skip')} onPress={() => goBack(`/job/${id}`)} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          scrollEnabled={!drawing}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="body" color={colors.textSecondary}>
            {t('signature.intro')}
          </Text>

          {!isPro ? (
            <View style={{ flexDirection: 'row' }}>
              <StatusBadge label={t('signature.proFeature')} tone="accent" />
            </View>
          ) : null}

          <Input
            label={t('signature.clientName')}
            placeholder={t('signature.clientNamePlaceholder')}
            value={customerName}
            onChangeText={setCustomerName}
          />

          <View>
            <Text variant="label" color={colors.textSecondary} style={{ marginBottom: 6 }}>
              {t('signature.canvasLabel')}
            </Text>
            <SignatureCanvas key={canvasKey} ref={canvasRef} onDrawingChange={setDrawing} />
          </View>

          {signature ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('signature.replaceHint')}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button label={t('signature.clear')} variant="secondary" onPress={handleClear} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('signature.accept')} onPress={handleSave} loading={saving} />
            </View>
          </View>
          {signature ? (
            <Button label={t('signature.removeSaved')} variant="tertiary" onPress={handleRemoveSignature} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
