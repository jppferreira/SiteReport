import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LocalImage, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';

import { GUIDED_DURATION_KEY, GuidedChip, GuidedStep, GuidedStepId } from './guidedSteps';
import { iconForStep } from './stepIcons';

type PhotoStageCounts = { before: number; during: number; after: number };

type GuidedStepListProps = {
  steps: GuidedStep[];
  currentId: GuidedStepId | null;
  isPro: boolean;
  photoCounts: PhotoStageCounts;
  photoThumbs: string[];
  showYourStepsLabel: boolean;
  onPressStep: (id: GuidedStepId) => void;
  onAddAfterPhotos: () => void;
  onMeasure: () => void;
};

export function GuidedStepList({
  steps,
  currentId,
  isPro,
  photoCounts,
  photoThumbs,
  showYourStepsLabel,
  onPressStep,
  onAddAfterPhotos,
  onMeasure,
}: GuidedStepListProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const currentIndex = currentId ? steps.findIndex((s) => s.id === currentId) : -1;
  const before = currentIndex >= 0 ? steps.slice(0, currentIndex).filter((s) => s.status === 'complete') : steps.filter((s) => s.status === 'complete');
  const after =
    currentIndex >= 0
      ? steps.slice(currentIndex + 1)
      : steps.filter((s) => s.status !== 'complete');
  const currentStep = currentIndex >= 0 ? steps[currentIndex]! : null;

  return (
    <View style={styles.wrap}>
      {showYourStepsLabel ? (
        <Text variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
          {t('jobDetail.guided.yourSteps')}
        </Text>
      ) : null}

      {before.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {before.map((step, index) => (
            <DoneRow
              key={step.id}
              step={step}
              showDivider={index < before.length - 1}
              onPress={() => onPressStep(step.id)}
            />
          ))}
        </View>
      ) : null}

      {currentStep ? (
        <CurrentStepCard
          step={currentStep}
          isPro={isPro}
          photoCounts={photoCounts}
          photoThumbs={photoThumbs}
          onPress={() => onPressStep(currentStep.id)}
          onAddAfterPhotos={onAddAfterPhotos}
          onMeasure={onMeasure}
        />
      ) : null}

      {after.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {after.map((step, index) =>
            step.status === 'complete' ? (
              <DoneRow
                key={step.id}
                step={step}
                showDivider={index < after.length - 1}
                onPress={() => onPressStep(step.id)}
              />
            ) : (
              <UpcomingRow
                key={step.id}
                step={step}
                isPro={isPro}
                showDivider={index < after.length - 1}
                onPress={() => onPressStep(step.id)}
              />
            )
          )}
        </View>
      ) : null}
    </View>
  );
}

function DoneRow({
  step,
  showDivider,
  onPress,
}: {
  step: GuidedStep;
  showDivider: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactRow,
        {
          borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.doneTile, { backgroundColor: colors.accent }]}>
        <Ionicons name="checkmark" size={16} color={colors.accentOnAccent} />
      </View>
      <View style={styles.copy}>
        <Text variant="bodySmall" style={styles.compactTitle}>
          {t(`jobDetail.guided.steps.${step.id}.title`)}
        </Text>
        {step.summaryChips.length > 0 ? (
          <View style={styles.chipRow}>
            {step.summaryChips.map((chip) => (
              <Chip key={chip.id} chip={{ ...chip, label: summarizeChipLabel(t, step.id, chip) }} tone="done" />
            ))}
          </View>
        ) : null}
      </View>
      <Text variant="caption" color={colors.textTertiary} style={styles.editLabel}>
        {t('jobDetail.guided.edit')}
      </Text>
    </Pressable>
  );
}

function UpcomingRow({
  step,
  isPro,
  showDivider,
  onPress,
}: {
  step: GuidedStep;
  isPro: boolean;
  showDivider: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactRow,
        {
          borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.iconTileSm, { backgroundColor: colors.surfaceSunken }]}>
        <Ionicons name={iconForStep(step.id)} size={16} color={colors.textPrimary} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text variant="bodySmall" style={styles.compactTitle}>
            {t(`jobDetail.guided.steps.${step.id}.title`)}
          </Text>
          {step.badge === 'ar' ? <MetaBadge label={t('jobDetail.guided.badgeAr')} /> : null}
          {step.badge === 'voice' ? <MetaBadge label={t('jobDetail.guided.badgeVoice')} /> : null}
          {step.badge === 'pro' && !isPro ? <ProBadge /> : null}
        </View>
        <MetaLine stepId={step.id} requirement={step.requirement} />
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function CurrentStepCard({
  step,
  isPro,
  photoCounts,
  photoThumbs,
  onPress,
  onAddAfterPhotos,
  onMeasure,
}: {
  step: GuidedStep;
  isPro: boolean;
  photoCounts: PhotoStageCounts;
  photoThumbs: string[];
  onPress: () => void;
  onAddAfterPhotos: () => void;
  onMeasure: () => void;
}) {
  const { colors, shadows } = useTheme();
  const { t } = useI18n();
  const isPhotos = step.id === 'photos';
  const inProgress = step.status === 'in_progress';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.currentCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.accent,
          opacity: pressed ? 0.96 : 1,
        },
        shadows.card,
      ]}
    >
      <View style={styles.currentHead}>
        <View style={[styles.iconTileLg, { backgroundColor: colors.accent }]}>
          <Ionicons name={iconForStep(step.id)} size={20} color={colors.accentOnAccent} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text variant="bodyMedium" style={styles.currentTitle}>
              {t(`jobDetail.guided.steps.${step.id}.title`)}
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: inProgress ? colors.inProgressBg : colors.accentSoft,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  fontSize: 10,
                  fontFamily: fontFamily.semibold,
                  color: inProgress ? colors.inProgressFg : colors.accentPressed,
                }}
              >
                {inProgress ? t('jobDetail.guided.inProgress') : t('jobDetail.guided.upNext')}
              </Text>
            </View>
          </View>
          {step.photosMeta ? (
            <Text variant="caption" color={colors.textSecondary} style={styles.statusLine}>
              {photosStatusLabel(t, step.photosMeta)}
            </Text>
          ) : (
            <MetaLine stepId={step.id} requirement={step.requirement} emphasizeRequired />
          )}
        </View>
        {isPhotos && inProgress ? (
          <Ionicons name="chevron-up" size={18} color={colors.textTertiary} />
        ) : null}
      </View>

      {!inProgress || step.id === 'details' ? (
        <Text variant="caption" color={colors.textSecondary} style={styles.description}>
          {t(`jobDetail.guided.steps.${step.id}.description`)}
        </Text>
      ) : null}

      {step.detailChips && step.id === 'details' ? (
        <View style={styles.chipRow}>
          {step.detailChips.map((chip) => {
            const label =
              chip.id === 'title'
                ? t('jobDetail.guided.chipTitleAdded')
                : chip.id === 'customer'
                  ? t('jobDetail.guided.chipCustomer')
                  : t('jobDetail.guided.chipTrade');
            return <Chip key={chip.id} chip={{ ...chip, label }} tone={chip.done ? 'done' : 'todo'} />;
          })}
        </View>
      ) : null}

      {isPhotos && inProgress ? (
        <>
          <View style={styles.stages}>
            <StagePill
              label={t('jobDetail.guided.stageBefore', { count: photoCounts.before })}
              done={photoCounts.before > 0}
            />
            <StagePill
              label={t('jobDetail.guided.stageDuring', { count: photoCounts.during })}
              done={photoCounts.during > 0}
            />
            <StagePill
              label={t('jobDetail.guided.stageAfter', { count: photoCounts.after })}
              done={photoCounts.after > 0}
              missing={photoCounts.after === 0}
            />
          </View>

          {photoThumbs.length > 0 ? (
            <View style={styles.thumbs}>
              {photoThumbs.slice(0, 4).map((uri) => (
                <LocalImage key={uri} uri={uri} style={styles.thumb} />
              ))}
              {(() => {
                const total = photoCounts.before + photoCounts.during + photoCounts.after;
                const shown = Math.min(4, photoThumbs.length);
                const more = total - shown;
                if (more <= 0) return null;
                return (
                  <View style={[styles.thumbMore, { backgroundColor: colors.surfaceSunken }]}>
                    <Text variant="bodySmall" color={colors.textSecondary} style={{ fontFamily: fontFamily.semibold }}>
                      +{more}
                    </Text>
                  </View>
                );
              })()}
            </View>
          ) : null}

          <View style={styles.quickActions}>
            <Pressable
              onPress={onAddAfterPhotos}
              style={[styles.quickPrimary, { backgroundColor: colors.ctaDark }]}
            >
              <Ionicons name="camera-outline" size={16} color={colors.textInverse} />
              <Text variant="bodySmall" color={colors.textInverse} style={styles.quickLabel}>
                {t('jobDetail.guided.addAfterPhotos')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onMeasure}
              style={[styles.quickSecondary, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
            >
              <Ionicons name="resize-outline" size={16} color={colors.textPrimary} />
              <Text variant="bodySmall" style={styles.quickLabel}>
                {t('jobDetail.guided.measure')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {step.badge === 'pro' && !isPro ? (
        <View style={styles.titleRow}>
          <ProBadge />
        </View>
      ) : null}
    </Pressable>
  );
}

function MetaLine({
  stepId,
  requirement,
  emphasizeRequired = false,
}: {
  stepId: GuidedStepId;
  requirement: GuidedStep['requirement'];
  emphasizeRequired?: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const required = requirement === 'required';
  const label =
    requirement === 'required'
      ? t('jobDetail.guided.required')
      : requirement === 'recommended'
        ? t('jobDetail.guided.recommended')
        : t('jobDetail.guided.optional');

  return (
    <View style={styles.metaLine}>
      <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
      <Text variant="caption" color={colors.textTertiary} style={styles.metaCaption}>
        {t(GUIDED_DURATION_KEY[stepId])}
      </Text>
      <Text variant="caption" color={colors.textTertiary} style={styles.metaCaption}>
        ·
      </Text>
      <Text
        variant="caption"
        color={required && emphasizeRequired ? colors.textPrimary : colors.textTertiary}
        style={[
          styles.metaCaption,
          required && emphasizeRequired ? { fontFamily: fontFamily.semibold, color: colors.textPrimary } : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function Chip({ chip, tone }: { chip: GuidedChip; tone: 'done' | 'todo' }) {
  const { colors } = useTheme();
  if (tone === 'done') {
    return (
      <View style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
        {chip.done !== false ? <Ionicons name="checkmark" size={12} color={colors.accentPressed} /> : null}
        <Text variant="caption" color={colors.accentPressed} style={styles.chipLabel}>
          {chip.label}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
      <Text variant="caption" color={colors.textSecondary} style={styles.chipLabel}>
        {chip.label}
      </Text>
    </View>
  );
}

function MetaBadge({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metaBadge, { backgroundColor: colors.surfaceSunken }]}>
      <Text variant="caption" color={colors.textSecondary} style={styles.metaBadgeLabel}>
        {label}
      </Text>
    </View>
  );
}

function ProBadge() {
  const { colors } = useTheme();
  return (
    <View style={[styles.proBadge, { backgroundColor: colors.textPrimary }]}>
      <Ionicons name="lock-closed" size={9} color={colors.textInverse} />
      <Text variant="caption" color={colors.textInverse} style={styles.proLabel}>
        PRO
      </Text>
    </View>
  );
}

function photosStatusLabel(
  t: (key: string, options?: Record<string, string | number>) => string,
  meta: NonNullable<GuidedStep['photosMeta']>
): string {
  if (meta.afterMissing) {
    return meta.area
      ? t('jobDetail.guided.photosStatusLine', { area: meta.area, count: meta.count })
      : t('jobDetail.guided.photosStatusLineNoArea', { count: meta.count });
  }
  return meta.area
    ? t('jobDetail.guided.photosStatusComplete', { area: meta.area, count: meta.count })
    : t('jobDetail.guided.photosStatusCompleteNoArea', { count: meta.count });
}

function summarizeChipLabel(
  t: (key: string, options?: Record<string, string | number>) => string,
  stepId: GuidedStepId,
  chip: GuidedChip
): string {
  if (stepId === 'measure' && chip.id === 'count') {
    const count = Number(chip.label);
    return count === 1 ? t('jobDetail.guided.oneMeasurement') : t('jobDetail.guided.measurementsCount', { count });
  }
  if (stepId === 'level' && chip.id === 'level') {
    return chip.label
      ? t('jobDetail.guided.levelDegrees', { degrees: chip.label })
      : t('jobDetail.guided.levelChecked');
  }
  return chip.label;
}

function StagePill({
  label,
  done,
  missing = false,
}: {
  label: string;
  done: boolean;
  missing?: boolean;
}) {
  const { colors } = useTheme();
  if (missing && !done) {
    return (
      <View style={[styles.stage, styles.stageMissing, { backgroundColor: colors.surface, borderColor: colors.inProgressBorder }]}>
        <Ionicons name="camera-outline" size={12} color={colors.inProgressFg} />
        <Text variant="caption" style={[styles.stageLabel, { color: colors.inProgressFg }]}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.stage, { backgroundColor: colors.accentSoft }]}>
      {done ? <Ionicons name="checkmark" size={12} color={colors.accentPressed} /> : null}
      <Text variant="caption" color={colors.accentPressed} style={styles.stageLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.88,
    fontFamily: fontFamily.semibold,
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 10,
  },
  doneTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileSm: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileLg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  compactTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fontFamily.medium,
  },
  currentTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: fontFamily.semibold,
  },
  editLabel: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaCaption: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: fontFamily.regular,
    letterSpacing: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontFamily.medium,
    letterSpacing: 0,
  },
  metaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  metaBadgeLabel: {
    fontSize: 9,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  proLabel: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    letterSpacing: 0,
  },
  currentCard: {
    borderWidth: 2,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 14,
    gap: 12,
  },
  currentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusLine: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: fontFamily.regular,
    letterSpacing: 0,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontFamily.regular,
    letterSpacing: 0,
  },
  stages: {
    flexDirection: 'row',
    gap: 6,
  },
  stage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 10,
  },
  stageMissing: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    // borderColor is set dynamically to inProgressBorder in the component
  },
  stageLabel: {
    fontSize: 12,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0,
  },
  thumbs: {
    flexDirection: 'row',
    gap: 6,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  thumbMore: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  quickSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickLabel: {
    fontSize: 13,
    fontFamily: fontFamily.semibold,
  },
});
