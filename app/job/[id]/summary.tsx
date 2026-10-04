import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { NavigationHeader, Screen, Text, TextArea, TextButton } from '@/components';
import { useAutosaveField } from '@/hooks/useAutosaveField';
import { useWorkSummary } from '@/hooks/useWorkSummary';
import { useTheme } from '@/theme';

export default function WorkSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { summary, loading, save } = useWorkSummary(id);

  const workCompleted = useAutosaveField(summary?.workCompleted ?? '', async (value) => {
    await save({ workCompleted: value });
  });
  const materials = useAutosaveField(summary?.materials ?? '', async (value) => {
    await save({ materials: value });
  });
  const recommendations = useAutosaveField(summary?.recommendations ?? '', async (value) => {
    await save({ recommendations: value });
  });
  const notes = useAutosaveField(summary?.notes ?? '', async (value) => {
    await save({ notes: value });
  });

  if (loading) {
    return (
      <Screen>
        <NavigationHeader title="Work summary" onBack={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <NavigationHeader
        title="Work summary"
        onBack={async () => {
          await Promise.all([workCompleted.flush(), materials.flush(), recommendations.flush(), notes.flush()]);
          router.back();
        }}
        right={<TextButton label="Done" onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <TextArea
              label="Work completed"
              placeholder="Describe the work carried out…"
              value={workCompleted.value}
              onChangeText={workCompleted.onChange}
              onBlur={workCompleted.flush}
              minHeight={140}
            />
            <SaveStatus status={workCompleted.status} />
          </View>

          <View>
            <TextArea
              label="Materials used"
              placeholder="Optional — list materials used"
              value={materials.value}
              onChangeText={materials.onChange}
              onBlur={materials.flush}
              minHeight={90}
            />
          </View>

          <View>
            <TextArea
              label="Recommendations / next steps"
              placeholder="Optional — anything the customer should know"
              value={recommendations.value}
              onChangeText={recommendations.onChange}
              onBlur={recommendations.flush}
              minHeight={90}
            />
          </View>

          <View>
            <TextArea
              label="Additional notes"
              placeholder="Optional — notes for your own records"
              value={notes.value}
              onChangeText={notes.onChange}
              onBlur={notes.flush}
              minHeight={90}
            />
          </View>

          <Text variant="caption" color={colors.textSecondary}>
            Your keyboard&rsquo;s microphone button supports speech-to-text for any of these fields.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SaveStatus({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  const { colors } = useTheme();
  if (status === 'idle') return null;
  return (
    <Text variant="caption" color={status === 'error' ? colors.destructive : colors.textSecondary} style={{ marginTop: 6 }}>
      {status === 'saving' ? 'Saving…' : status === 'error' ? "Couldn't save — check your storage." : 'Saved'}
    </Text>
  );
}
