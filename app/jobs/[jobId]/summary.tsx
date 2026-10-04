import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/core/Button';
import { TextArea } from '@/components/core/Input';
import { AppText } from '@/components/core/AppText';
import { LoadingState } from '@/components/feedback/LoadingState';
import { databaseService } from '@/services/databaseService';
import { colors, spacing } from '@/theme';

export default function SummaryScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workCompleted, setWorkCompleted] = useState('');
  const [materials, setMaterials] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    const summary = await databaseService.getWorkSummary(jobId);
    setWorkCompleted(summary?.workCompleted ?? '');
    setMaterials(summary?.materials ?? '');
    setRecommendations(summary?.recommendations ?? '');
    setNotes(summary?.notes ?? '');
    setLoading(false);
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (!jobId || loading) return;
    const timeout = setTimeout(() => {
      void (async () => {
        setSaving(true);
        await databaseService.upsertWorkSummary(jobId, { workCompleted, materials, recommendations, notes });
        await databaseService.markReportsStale(jobId);
        setSaving(false);
      })();
    }, 350);
    return () => clearTimeout(timeout);
  }, [workCompleted, materials, recommendations, notes, jobId, loading]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading summary…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="h2">Work completed</AppText>
        <TextArea
          label="Work completed"
          value={workCompleted}
          onChangeText={setWorkCompleted}
          placeholder="Describe the work carried out…"
        />
        <TextArea label="Materials used" value={materials} onChangeText={setMaterials} placeholder="Optional" />
        <TextArea
          label="Recommendations / next steps"
          value={recommendations}
          onChangeText={setRecommendations}
          placeholder="Optional"
        />
        <TextArea label="Additional notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
        <Button label={saving ? 'Saving…' : 'Autosave enabled'} onPress={() => undefined} disabled />
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
    gap: spacing.md,
    paddingBottom: spacing.x5,
  },
});
