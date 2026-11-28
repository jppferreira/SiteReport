import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { NavigationHeader, Screen, Text, ToggleRow, useToast } from '@/components';
import { jobChecklistsRepository } from '@/database';
import { useI18n } from '@/i18n/useI18n';
import {
  checklistProgress,
  checklistTemplateById,
  Job,
  JobChecklist,
  JOB_CHECKLIST_TEMPLATES,
  JobChecklistTemplateId,
} from '@/models';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';
import { goBack } from '@/utils/goBack';

type JobChecklistScreenProps = {
  job: Job;
  initial: JobChecklist;
};

export function JobChecklistView({ job, initial }: JobChecklistScreenProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const { showToast } = useToast();
  const [checklist, setChecklist] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');

  const progress = checklistProgress(checklist.items);
  const template = checklistTemplateById(checklist.templateId);
  const subtitle = [job.address, formatDate(job.jobDate)].filter(Boolean).join(' · ');

  const applyTemplate = async (templateId: JobChecklistTemplateId) => {
    const next = await jobChecklistsRepository.applyTemplate(job.id, templateId);
    setChecklist(next);
    showToast({ message: t('checklist.toastTemplateApplied'), tone: 'success' });
  };

  const onChangeTemplate = () => {
    Alert.alert(
      t('checklist.changeTemplateTitle'),
      t('checklist.changeTemplateDescription'),
      [
        ...JOB_CHECKLIST_TEMPLATES.map((item) => ({
          text: item.name,
          onPress: () => void applyTemplate(item.id),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]
    );
  };

  const nextUnchecked = checklist.items.find((item) => !item.checked);

  return (
    <Screen>
      <NavigationHeader title={t('checklist.title')} onBack={() => goBack(`/job/${job.id}`)} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 4, gap: 14 }}>
        <View>
          <Text variant="h2">{job.title}</Text>
          {subtitle ? (
            <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onChangeTemplate}
          style={[styles.templateChip, { backgroundColor: colors.accentSoft, borderColor: '#BFE6CB' }]}
        >
          <View style={[styles.iconTile, { backgroundColor: colors.surface }]}>
            <Ionicons name="clipboard-outline" size={17} color={colors.accent} />
          </View>
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            {t('checklist.templateLabel', { name: template?.name ?? t('checklist.customTemplate') })}
          </Text>
          <Text variant="bodyMedium" color={colors.accent}>
            {t('checklist.change')}
          </Text>
        </Pressable>

        <View style={{ gap: 7 }}>
          <Text variant="caption" color={colors.textTertiary}>
            {t('checklist.quickStart')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {JOB_CHECKLIST_TEMPLATES.filter((item) => item.id !== checklist.templateId).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => void applyTemplate(item.id)}
                style={[styles.quickChip, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
              >
                <Text variant="caption" color={colors.textPrimary} style={{ fontSize: 12.5, fontWeight: '500' }}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: 8 }}>
          <View style={styles.progressLabel}>
            <Text variant="bodyMedium">
              {t('checklist.progressChecked', { checked: progress.checked, total: progress.total })}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {progress.percent}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.checklistTrack }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.accent, width: `${progress.percent}%` as `${number}%` },
              ]}
            />
          </View>
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {checklist.items.map((item) => {
            const isNext = nextUnchecked?.id === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={async () => {
                  const next = await jobChecklistsRepository.toggleItem(job.id, item.id);
                  setChecklist(next);
                }}
                style={[styles.itemRow, { borderBottomColor: colors.border }]}
              >
                <View
                  style={[
                    styles.check,
                    item.checked
                      ? { backgroundColor: colors.accent }
                      : { borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: 'transparent' },
                  ]}
                >
                  {item.checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                </View>
                <Text
                  variant="body"
                  style={{ flex: 1, fontWeight: isNext ? '600' : '400' }}
                  color={colors.textPrimary}
                >
                  {item.label}
                </Text>
                {isNext ? (
                  <View style={[styles.nextPill, { backgroundColor: colors.accentSoft }]}>
                    <Text variant="caption" color={colors.accentPressed} style={{ fontWeight: '600', fontSize: 11 }}>
                      {t('checklist.next')}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          {adding ? (
            <View style={[styles.itemRow, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.check, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="add" size={14} color={colors.accent} />
              </View>
              <TextInput
                autoFocus
                value={draftLabel}
                onChangeText={setDraftLabel}
                placeholder={t('checklist.addPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                style={{ flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 0 }}
                onSubmitEditing={async () => {
                  const next = await jobChecklistsRepository.addItem(job.id, draftLabel);
                  setChecklist(next);
                  setDraftLabel('');
                  setAdding(false);
                }}
                onBlur={() => {
                  if (!draftLabel.trim()) setAdding(false);
                }}
              />
            </View>
          ) : (
            <Pressable
              onPress={() => setAdding(true)}
              style={[styles.itemRow, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: colors.border }]}
            >
              <View style={[styles.check, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="add" size={14} color={colors.accent} />
              </View>
              <Text variant="bodyMedium" color={colors.accent}>
                {t('checklist.addItem')}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.pdfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ToggleRow
            label={t('checklist.includeInPdf')}
            description={t('checklist.includeInPdfHint')}
            value={checklist.includeInPdf}
            onValueChange={async (value) => {
              const next = await jobChecklistsRepository.setIncludeInPdf(job.id, value);
              setChecklist(next);
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pdfCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});
