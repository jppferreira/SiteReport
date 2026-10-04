import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, Input, NavigationHeader, Screen, StatusBadge, Text, TextButton, useToast } from '@/components';
import { signatureRepository } from '@/database';
import { SignatureCanvas, SignatureCanvasHandle } from '@/features/signature/SignatureCanvas';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useSignature } from '@/hooks/useSignature';
import { writeTextFile, deleteFileSafely, jobDirectory } from '@/services/fileService';
import { useTheme } from '@/theme';

export default function SignatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { signature, loading, refresh } = useSignature(id);
  const { isPro } = useEntitlement();
  const { showToast } = useToast();
  const canvasRef = useRef<SignatureCanvasHandle>(null);
  const [customerName, setCustomerName] = useState(signature?.customerName ?? '');
  const [saving, setSaving] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleClear = () => {
    canvasRef.current?.clear();
  };

  const handleSave = async () => {
    const handle = canvasRef.current;
    if (!handle || handle.isEmpty()) {
      showToast({ message: 'Draw a signature before saving', tone: 'warning' });
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
      showToast({ message: 'Signature saved', tone: 'success' });
      refresh();
      router.back();
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
    showToast({ message: 'Signature removed', tone: 'neutral' });
  };

  if (loading) {
    return (
      <Screen>
        <NavigationHeader title="Customer sign-off" onBack={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader
        title="Customer sign-off"
        onBack={() => router.back()}
        right={<TextButton label="Skip" onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="body" color={colors.textSecondary}>
            A signature confirms the customer&rsquo;s acknowledgement of the completed work shown in this report.
            This is entirely optional — you can generate a report without one.
          </Text>

          {!isPro ? (
            <View style={{ flexDirection: 'row' }}>
              <StatusBadge label="PRO FEATURE" tone="accent" />
            </View>
          ) : null}

          <Input label="Customer name" placeholder="Who is signing?" value={customerName} onChangeText={setCustomerName} />

          <View>
            <Text variant="label" color={colors.textSecondary} style={{ marginBottom: 6 }}>
              Signature
            </Text>
            <SignatureCanvas key={canvasKey} ref={canvasRef} />
          </View>

          {signature ? (
            <Text variant="caption" color={colors.textSecondary}>
              A signature is already saved for this job. Saving again will replace it.
            </Text>
          ) : null}

          <View style={{ gap: spacing.xs }}>
            <Button label="Save signature" onPress={handleSave} loading={saving} />
            <Button label="Clear" variant="secondary" onPress={handleClear} />
            {signature ? <Button label="Remove saved signature" variant="tertiary" onPress={handleRemoveSignature} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
