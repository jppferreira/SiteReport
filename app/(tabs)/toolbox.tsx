import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import React, { useCallback, useState } from 'react';
import { Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Screen, Text } from '@/components';
import { useJobs } from '@/hooks/useJobs';
import { useI18n } from '@/i18n/useI18n';
import type { Job } from '@/models';
import { fontFamily, useTheme } from '@/theme';

const ILLUSTRATIONS = {
  measure: {
    light: require('../../assets/images/toolbox/measure-light.webp'),
    dark: require('../../assets/images/toolbox/measure-dark.webp'),
  },
  level: {
    light: require('../../assets/images/toolbox/level-light.webp'),
    dark: require('../../assets/images/toolbox/level-dark.webp'),
  },
  notes: {
    light: require('../../assets/images/toolbox/notes-light.webp'),
    dark: require('../../assets/images/toolbox/notes-dark.webp'),
  },
} as const;

type JobTool = 'measure' | 'notes';

export default function ToolboxScreen() {
  const { colors, spacing, radius, scheme } = useTheme();
  const { t } = useI18n();
  const tabBarHeight = useBottomTabBarHeight();
  const { jobs, refresh } = useJobs();
  const [pickJobFor, setPickJobFor] = useState<JobTool | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const openJobTool = (tool: JobTool) => {
    if (jobs.length === 1) {
      goToJobTool(jobs[0]!, tool);
      return;
    }
    setPickJobFor(tool);
  };

  const goToJobTool = (job: Job, tool: JobTool) => {
    setPickJobFor(null);
    router.push(tool === 'notes' ? `/job/${job.id}/summary` : `/job/${job.id}/measure`);
  };

  const pickCopy =
    pickJobFor === 'notes'
      ? {
          title: t('toolbox.pickJobNotesTitle'),
          body: t('toolbox.pickJobNotesBody'),
          emptyBody: t('toolbox.noJobsNotesBody'),
        }
      : {
          title: t('toolbox.pickJobTitle'),
          body: t('toolbox.pickJobBody'),
          emptyBody: t('toolbox.noJobsBody'),
        };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: 4 }}>
        <Text variant="display">{t('toolbox.title')}</Text>
        <Text variant="body" color={colors.textSecondary}>
          {t('toolbox.subtitle')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.lg + tabBarHeight,
          gap: 12,
        }}
      >
        <View style={styles.toolsRow}>
          <ToolCard
            illustration={ILLUSTRATIONS.measure[scheme]}
            title={t('toolbox.measureTitle')}
            subtitle={t('toolbox.measureSubtitle')}
            onPress={() => openJobTool('measure')}
          />
          <ToolCard
            illustration={ILLUSTRATIONS.level[scheme]}
            title={t('toolbox.levelTitle')}
            subtitle={t('toolbox.levelSubtitle')}
            onPress={() => router.push('/tools/level')}
          />
          <ToolCard
            illustration={ILLUSTRATIONS.notes[scheme]}
            title={t('toolbox.notesTitle')}
            subtitle={t('toolbox.notesSubtitle')}
            onPress={() => openJobTool('notes')}
          />
        </View>
      </ScrollView>

      <BottomSheet visible={pickJobFor != null} onClose={() => setPickJobFor(null)} dragHandleOnly>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md }}>
          <View style={{ gap: 4 }}>
            <Text variant="h3">{pickCopy.title}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {pickCopy.body}
            </Text>
          </View>

          {jobs.length === 0 ? (
            <View
              style={[
                styles.emptyJobs,
                { backgroundColor: colors.surfaceSunken, borderRadius: radius.lg, padding: spacing.lg },
              ]}
            >
              <Text variant="bodyMedium">{t('toolbox.noJobsTitle')}</Text>
              <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4 }}>
                {pickCopy.emptyBody}
              </Text>
              <Button
                label={t('toolbox.createJob')}
                onPress={() => {
                  setPickJobFor(null);
                  router.push('/job/new');
                }}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : (
            <View style={{ gap: 4 }}>
              <Text
                variant="caption"
                color={colors.textTertiary}
                style={{ textTransform: 'uppercase', marginBottom: 4 }}
              >
                {t('toolbox.recentJobs')}
              </Text>
              {jobs.slice(0, 8).map((job) => (
                <Pressable
                  key={job.id}
                  onPress={() => pickJobFor && goToJobTool(job, pickJobFor)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.jobRow,
                    {
                      backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {job.title}
                    </Text>
                    {job.customerName ? (
                      <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                        {job.customerName}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </BottomSheet>
    </Screen>
  );
}

function ToolCard({
  illustration,
  title,
  subtitle,
  onPress,
}: {
  illustration: ImageSourcePropType;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors, scheme } = useTheme();
  const darkCard = scheme === 'dark';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toolCard,
        {
          backgroundColor: colors.surface,
          ...(darkCard
            ? {}
            : {
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
              }),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.toolTop}>
        <Image
          source={illustration}
          style={styles.toolArt}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
      <View style={{ gap: 4 }}>
        <Text
          variant="body"
          color={darkCard ? colors.textInverse : colors.textPrimary}
          style={{ fontFamily: fontFamily.semibold, fontSize: 16 }}
        >
          {title}
        </Text>
        <Text
          variant="caption"
          color={colors.textSecondary}
          style={{ fontSize: 12, lineHeight: 16 }}
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolCard: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    minHeight: 168,
  },
  toolTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  toolArt: {
    width: 72,
    height: 72,
  },
  emptyJobs: {
    gap: 2,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
