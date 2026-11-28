import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, Text } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import {
  CoverDesignId,
  FREE_REPORT_TEMPLATE_IDS,
  isFreeReportTemplate,
  ReportSectionId,
  ReportSections,
  REPORT_SECTION_IDS,
  ReportTemplateId,
  REVIEW_PROVIDER_LABELS,
  ReviewProvider,
  templateMatchesTradeFilter,
  TemplateTradeFilter,
  TRAY_COVER_STYLES,
} from '@/models';
import { REPORT_TEMPLATES } from '@/services/pdfService';
import { useTheme } from '@/theme';
import { ACCENT_PRESETS, accentSwatchInk, DEFAULT_ACCENT, parseAccentHex } from '@/utils/accentColor';

import { LayoutThumb } from './LayoutThumb';

export type PreviewTrayTab = 'templates' | 'colour' | 'sections';

type SectionMeta = {
  photoCount: number;
  checklistChecked: number;
  checklistTotal: number;
  reviewProvider: ReviewProvider;
  hasReviewUrl: boolean;
  businessInitial: string;
};

type PreviewStyleTrayProps = {
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  tab: PreviewTrayTab;
  onTabChange: (tab: PreviewTrayTab) => void;
  template: ReportTemplateId;
  pendingProTemplate: ReportTemplateId | null;
  onSelectTemplate: (id: ReportTemplateId) => void;
  onUnlockPro: () => void;
  onColourLocked: () => void;
  onReviewLocked: () => void;
  onUseFreeLayout: () => void;
  isPro: boolean;
  coverDesign: CoverDesignId;
  onCoverDesign: (id: CoverDesignId) => void;
  accentColor: string;
  usingBrandColour: boolean;
  onBrandColour: () => void;
  onAccentSwatch: (hex: string) => void;
  onCustomAccent: () => void;
  sections: ReportSections;
  sectionOrder: ReportSectionId[];
  onToggleSection: (id: ReportSectionId, value: boolean) => void;
  onMoveSection: (id: ReportSectionId, direction: -1 | 1) => void;
  sectionMeta: SectionMeta;
  ctaLabel: string;
  onCreatePdf: () => void;
  onShare: () => void;
  tradeFilter: TemplateTradeFilter;
  onTradeFilter: (filter: TemplateTradeFilter) => void;
};

const STRIP_VISIBLE = 5;

export function PreviewStyleTray({
  expanded,
  onExpand,
  onCollapse,
  tab,
  onTabChange,
  template,
  pendingProTemplate,
  onSelectTemplate,
  onUnlockPro,
  onColourLocked,
  onReviewLocked,
  onUseFreeLayout,
  isPro,
  coverDesign,
  onCoverDesign,
  accentColor,
  usingBrandColour,
  onBrandColour,
  onAccentSwatch,
  onCustomAccent,
  sections,
  sectionOrder,
  onToggleSection,
  onMoveSection,
  sectionMeta,
  ctaLabel,
  onCreatePdf,
  onShare,
  tradeFilter,
  onTradeFilter,
}: PreviewStyleTrayProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const activeId = pendingProTemplate ?? template;
  const activeOption = REPORT_TEMPLATES.find((option) => option.id === activeId) ?? REPORT_TEMPLATES[0]!;
  const lockedPending = pendingProTemplate != null && !isPro && !isFreeReportTemplate(pendingProTemplate);
  const activeIsFree = isFreeReportTemplate(activeId);

  const stripTemplates = useMemo(() => {
    const list = [...REPORT_TEMPLATES];
    const selectedIndex = list.findIndex((option) => option.id === activeId);
    if (selectedIndex >= STRIP_VISIBLE) {
      const [selected] = list.splice(selectedIndex, 1);
      if (selected) list.unshift(selected);
    }
    return list.slice(0, STRIP_VISIBLE);
  }, [activeId]);

  const moreCount = Math.max(0, REPORT_TEMPLATES.length - STRIP_VISIBLE);
  const proCount = REPORT_TEMPLATES.length - FREE_REPORT_TEMPLATE_IDS.length;

  const filteredTemplates = useMemo(
    () => REPORT_TEMPLATES.filter((option) => templateMatchesTradeFilter(option.id, tradeFilter)),
    [tradeFilter]
  );

  return (
    <>
      {!expanded ? (
        <View
          style={[
            styles.collapsed,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            },
            shadows.overlay,
          ]}
        >
          <Pressable onPress={onExpand} accessibilityRole="button" accessibilityLabel={t('preview.allTemplatesA11y')}>
            <View style={styles.handleHit}>
              <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
            </View>
          </Pressable>

          <View style={[styles.currentRow, { paddingHorizontal: spacing.md }]}>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.nameRow}>
                <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1} style={styles.templateName}>
                  {activeOption.label}
                </Text>
                {lockedPending ? (
                  <View style={[styles.pill, { backgroundColor: colors.ctaDark }]}>
                    <Ionicons name="lock-closed" size={9} color={colors.textInverse} />
                    <Text variant="caption" color={colors.textInverse} style={styles.pillText}>
                      {t('reports.templatePickerProBadge')}
                    </Text>
                  </View>
                ) : activeIsFree ? (
                  <View style={[styles.pill, { backgroundColor: colors.accentSoft }]}>
                    <Text variant="caption" color="#127A36" style={styles.pillText}>
                      {t('preview.freeBadge')}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.pill, { backgroundColor: colors.ctaDark }]}>
                    <Text variant="caption" color={colors.textInverse} style={styles.pillText}>
                      {t('reports.templatePickerProBadge')}
                    </Text>
                  </View>
                )}
              </View>
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {activeOption.hint || t('preview.templateDefaultBlurb')}
              </Text>
            </View>
            <Pressable
              onPress={onExpand}
              accessibilityRole="button"
              accessibilityLabel={t('preview.allTemplatesA11y')}
              style={[styles.allTemplatesBtn, { backgroundColor: colors.accentSoft }]}
            >
              <Text variant="caption" color="#127A36" style={{ fontWeight: '600' }}>
                {t('preview.allTemplates')}
              </Text>
              <Ionicons name="chevron-up" size={14} color="#127A36" />
            </Pressable>
          </View>

          {lockedPending ? (
            <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm, marginTop: spacing.sm }}>
              <Button
                label={t('preview.unlockPro')}
                variant="accent"
                onPress={onUnlockPro}
                icon={<Ionicons name="sparkles" size={18} color={colors.textInverse} />}
              />
              <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center' }}>
                {t('preview.unlockProHint')}
              </Text>
              <Button label={t('preview.useFreeLayout')} variant="secondary" onPress={onUseFreeLayout} />
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 9, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
              >
                {stripTemplates.map((option) => {
                  const active = option.id === activeId;
                  const locked = !isPro && !isFreeReportTemplate(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => onSelectTemplate(option.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.stripCard,
                        {
                          borderColor: active ? colors.accent : colors.border,
                          borderWidth: active ? 2 : 1,
                        },
                      ]}
                    >
                      <LayoutThumb template={option.id} accent={accentColor} />
                      {locked ? (
                        <View style={[styles.lockDot, { backgroundColor: colors.ctaDark }]}>
                          <Ionicons name="lock-closed" size={8} color={colors.textInverse} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
                {moreCount > 0 ? (
                  <Pressable
                    onPress={onExpand}
                    accessibilityRole="button"
                    accessibilityLabel={t('preview.moreTemplates', { count: moreCount })}
                    style={[styles.moreCard, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}
                  >
                    <Text variant="caption" color={colors.textSecondary} style={{ fontWeight: '600' }}>
                      {t('preview.moreTemplates', { count: moreCount })}
                    </Text>
                  </Pressable>
                ) : null}
              </ScrollView>

              <View style={[styles.actions, { paddingHorizontal: spacing.md }]}>
                <Pressable
                  onPress={onShare}
                  accessibilityRole="button"
                  accessibilityLabel={t('preview.shareA11y')}
                  style={[styles.shareBtn, { borderColor: colors.border, borderRadius: 14 }]}
                >
                  <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Button
                    label={ctaLabel}
                    onPress={onCreatePdf}
                    icon={<Ionicons name="document-text-outline" size={18} color={colors.textInverse} />}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      ) : null}

      <BottomSheet
        visible={expanded}
        onClose={onCollapse}
        dragHandleOnly
        maxHeight={Math.round(windowHeight * 0.82)}
      >
        {lockedPending && tab === 'templates' ? (
          <ProLockHeader
            label={activeOption.label}
            hint={activeOption.hint}
            onCollapse={onCollapse}
          />
        ) : (
          <View style={styles.sheetHeader}>
            <Text variant="h3" color={colors.textPrimary}>
              {tab === 'templates' ? t('preview.chooseLayout') : tab === 'colour' ? t('preview.tabColour') : t('preview.tabSections')}
            </Text>
            {tab === 'templates' ? (
              <Text variant="caption" color={colors.textSecondary}>
                {t('preview.layoutsCount', { total: REPORT_TEMPLATES.length, pro: proCount })}
              </Text>
            ) : null}
          </View>
        )}

        <SegmentedTabs tab={tab} onChange={onTabChange} />

        <ScrollView
          style={{ maxHeight: Math.round(windowHeight * 0.5) }}
          contentContainerStyle={{ paddingBottom: spacing.md, gap: spacing.md }}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'templates' ? (
            <TemplatesTab
              filter={tradeFilter}
              onFilter={onTradeFilter}
              templates={filteredTemplates}
              activeId={activeId}
              isPro={isPro}
              accentColor={accentColor}
              onSelect={onSelectTemplate}
            />
          ) : null}
          {tab === 'colour' ? (
            <ColourTab
              accentColor={accentColor}
              usingBrandColour={usingBrandColour}
              businessInitial={sectionMeta.businessInitial}
              isPro={isPro}
              coverDesign={coverDesign}
              onBrandColour={onBrandColour}
              onAccentSwatch={onAccentSwatch}
              onCustomAccent={onCustomAccent}
              onCoverDesign={onCoverDesign}
              onLocked={onColourLocked}
            />
          ) : null}
          {tab === 'sections' ? (
            <SectionsTab
              order={sectionOrder}
              sections={sections}
              meta={sectionMeta}
              isPro={isPro}
              onToggle={onToggleSection}
              onMove={onMoveSection}
              onLocked={onReviewLocked}
            />
          ) : null}
        </ScrollView>

        {lockedPending ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button
              label={t('preview.unlockPro')}
              variant="accent"
              onPress={onUnlockPro}
              icon={<Ionicons name="sparkles" size={18} color={colors.textInverse} />}
            />
            <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center' }}>
              {t('preview.unlockProHint')}
            </Text>
            <Button label={t('preview.useFreeLayout')} variant="secondary" onPress={onUseFreeLayout} />
          </View>
        ) : (
          <View style={[styles.sheetFooter, { marginTop: spacing.sm }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1}>
                {activeOption.label}
              </Text>
              <Text variant="caption" color={activeIsFree ? '#127A36' : colors.textSecondary}>
                {activeIsFree ? t('preview.metaFreeSelected') : t('preview.metaProSelected')}
              </Text>
            </View>
            <View style={{ flex: 1.2 }}>
              <Button
                label={ctaLabel}
                onPress={onCreatePdf}
                icon={<Ionicons name="document-text-outline" size={18} color={colors.textInverse} />}
              />
            </View>
          </View>
        )}
      </BottomSheet>
    </>
  );
}

function ProLockHeader({
  label,
  hint,
  onCollapse,
}: {
  label: string;
  hint: string;
  onCollapse: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.currentRow}>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.nameRow}>
          <Text variant="bodyMedium" color={colors.textPrimary}>
            {label}
          </Text>
          <View style={[styles.pill, { backgroundColor: colors.ctaDark }]}>
            <Ionicons name="lock-closed" size={9} color={colors.textInverse} />
            <Text variant="caption" color={colors.textInverse} style={styles.pillText}>
              {t('reports.templatePickerProBadge')}
            </Text>
          </View>
        </View>
        <Text variant="caption" color={colors.textSecondary}>
          {hint}
        </Text>
      </View>
      <Pressable
        onPress={onCollapse}
        style={[styles.allTemplatesBtn, { backgroundColor: colors.accentSoft }]}
        accessibilityRole="button"
        accessibilityLabel={t('preview.allTemplatesA11y')}
      >
        <Text variant="caption" color="#127A36" style={{ fontWeight: '600' }}>
          {t('preview.allTemplates')}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#127A36" />
      </Pressable>
    </View>
  );
}

function SegmentedTabs({
  tab,
  onChange,
}: {
  tab: PreviewTrayTab;
  onChange: (tab: PreviewTrayTab) => void;
}) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const items: { key: PreviewTrayTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'templates', label: t('preview.tabTemplates'), icon: 'layers-outline' },
    { key: 'colour', label: t('preview.tabColour'), icon: 'color-palette-outline' },
    { key: 'sections', label: t('preview.tabSections'), icon: 'list-outline' },
  ];
  return (
    <View style={[styles.segmented, { backgroundColor: '#EEF2EF', marginVertical: spacing.sm }]}>
      {items.map((item) => {
        const active = item.key === tab;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active ? { backgroundColor: colors.surface, ...styles.segmentActive } : null]}
          >
            <Ionicons name={item.icon} size={14} color={active ? colors.textPrimary : colors.textSecondary} />
            <Text
              variant="caption"
              color={active ? colors.textPrimary : colors.textSecondary}
              style={{ fontWeight: active ? '600' : '500' }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TemplatesTab({
  filter,
  onFilter,
  templates,
  activeId,
  isPro,
  accentColor,
  onSelect,
}: {
  filter: TemplateTradeFilter;
  onFilter: (filter: TemplateTradeFilter) => void;
  templates: typeof REPORT_TEMPLATES;
  activeId: ReportTemplateId;
  isPro: boolean;
  accentColor: string;
  onSelect: (id: ReportTemplateId) => void;
}) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const chips: { key: TemplateTradeFilter; label: string }[] = [
    { key: 'all', label: t('preview.filterAll') },
    { key: 'plumbing', label: t('preview.filterPlumbing') },
    { key: 'electrical', label: t('preview.filterElectrical') },
    { key: 'kitchens', label: t('preview.filterKitchens') },
  ];

  return (
    <View style={{ gap: spacing.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {chips.map((chip) => {
          const active = chip.key === filter;
          return (
            <Pressable
              key={chip.key}
              onPress={() => onFilter(chip.key)}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: colors.ctaDark }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text variant="caption" color={active ? colors.textInverse : colors.textPrimary} style={{ fontWeight: '600' }}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.grid}>
        {templates.map((option) => {
          const active = option.id === activeId;
          const locked = !isPro && !isFreeReportTemplate(option.id);
          const free = isFreeReportTemplate(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={styles.gridCard}
            >
              <View
                style={[
                  styles.gridThumb,
                  {
                    borderColor: active ? colors.accent : colors.border,
                    borderWidth: active ? 2 : 1,
                  },
                ]}
              >
                <LayoutThumb template={option.id} accent={accentColor} />
                {active ? (
                  <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                    <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                  </View>
                ) : null}
                {locked ? (
                  <View style={[styles.proBadge, { backgroundColor: colors.ctaDark }]}>
                    <Ionicons name="lock-closed" size={9} color={colors.textInverse} />
                    <Text variant="caption" color={colors.textInverse} style={styles.pillText}>
                      {t('reports.templatePickerProBadge')}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1}>
                {option.label}
              </Text>
              <Text variant="caption" color={free ? '#127A36' : colors.textSecondary} numberOfLines={1}>
                {free ? t('preview.metaFreeAllTrades') : option.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ColourTab({
  accentColor,
  usingBrandColour,
  businessInitial,
  isPro,
  coverDesign,
  onBrandColour,
  onAccentSwatch,
  onCustomAccent,
  onCoverDesign,
  onLocked,
}: {
  accentColor: string;
  usingBrandColour: boolean;
  businessInitial: string;
  isPro: boolean;
  coverDesign: CoverDesignId;
  onBrandColour: () => void;
  onAccentSwatch: (hex: string) => void;
  onCustomAccent: () => void;
  onCoverDesign: (id: CoverDesignId) => void;
  onLocked: () => void;
}) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const customSelected = isPro && !ACCENT_PRESETS.includes(accentColor as (typeof ACCENT_PRESETS)[number]) && !usingBrandColour;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.labelRow}>
        <Text variant="bodyMedium" color={colors.textPrimary}>
          {t('preview.accentColour')}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('preview.accentColourHint')}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          if (!isPro) {
            onLocked();
            return;
          }
          onBrandColour();
        }}
        style={[
          styles.brandColourCard,
          {
            borderRadius: 14,
            borderColor: usingBrandColour ? colors.accent : colors.border,
            backgroundColor: usingBrandColour ? colors.accentSoft : colors.surface,
            borderWidth: usingBrandColour ? 1.5 : 1,
          },
        ]}
      >
        <View style={[styles.monogram, { backgroundColor: accentColor || DEFAULT_ACCENT, borderRadius: 10 }]}>
          <Text variant="bodyMedium" color={accentSwatchInk(accentColor || DEFAULT_ACCENT)}>
            {businessInitial}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium" color={colors.textPrimary}>
            {t('preview.useBrandColour')}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {t('preview.useBrandColourHint')}
          </Text>
        </View>
        {usingBrandColour ? <Ionicons name="checkmark-circle" size={24} color={colors.accent} /> : null}
      </Pressable>

      <View style={[styles.swatchRow, { gap: spacing.sm }]}>
        {ACCENT_PRESETS.map((color) => {
          const selected = isPro && !usingBrandColour && color === accentColor;
          return (
            <Pressable
              key={color}
              onPress={() => {
                if (!isPro) {
                  onLocked();
                  return;
                }
                onAccentSwatch(color);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.swatch,
                {
                  backgroundColor: color,
                  borderWidth: selected ? 3 : (color === '#101310' ? 1.5 : 0),
                  borderColor: selected ? colors.textPrimary : colors.brandingSwatchRing,
                },
              ]}
            >
              {selected ? <Ionicons name="checkmark" size={16} color={accentSwatchInk(color)} /> : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => {
            if (!isPro) {
              onLocked();
              return;
            }
            onCustomAccent();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('preview.customAccentA11y')}
          style={[
            styles.swatch,
            {
              backgroundColor: customSelected ? accentColor : colors.surfaceSunken,
              borderWidth: customSelected ? 3 : 1,
              borderColor: customSelected ? colors.textPrimary : colors.borderStrong,
              borderStyle: customSelected ? 'solid' : 'dashed',
            },
          ]}
        >
          {customSelected ? (
            <Ionicons name="checkmark" size={16} color={accentSwatchInk(accentColor)} />
          ) : (
            <Ionicons name="add" size={18} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>

      <Text variant="bodyMedium" color={colors.textPrimary}>
        {t('preview.coverStyle')}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {TRAY_COVER_STYLES.map((style) => {
          const active = coverDesign === style.id;
          return (
            <Pressable
              key={style.id}
              onPress={() => onCoverDesign(style.id)}
              style={[
                styles.coverChip,
                active
                  ? { backgroundColor: colors.ctaDark }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text variant="caption" color={active ? colors.textInverse : colors.textPrimary} style={{ fontWeight: '500' }}>
                {t(style.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SectionsTab({
  order,
  sections,
  meta,
  isPro,
  onToggle,
  onMove,
  onLocked,
}: {
  order: ReportSectionId[];
  sections: ReportSections;
  meta: SectionMeta;
  isPro: boolean;
  onToggle: (id: ReportSectionId, value: boolean) => void;
  onMove: (id: ReportSectionId, direction: -1 | 1) => void;
  onLocked: () => void;
}) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();

  const rows: {
    id: ReportSectionId;
    label: string;
    hint: string;
    icon: keyof typeof Ionicons.glyphMap;
    pro?: boolean;
  }[] = order.map((id) => {
    switch (id) {
      case 'cover':
        return {
          id,
          label: t('preview.sectionCover'),
          hint: t('preview.sectionCoverHint'),
          icon: 'document-outline',
        };
      case 'photos':
        return {
          id,
          label: t('preview.sectionPhotos'),
          hint: t('preview.sectionPhotosHint', { count: meta.photoCount }),
          icon: 'images-outline',
        };
      case 'checklist':
        return {
          id,
          label: t('preview.sectionChecklist'),
          hint:
            meta.checklistTotal > 0
              ? t('preview.sectionChecklistHint', {
                  checked: meta.checklistChecked,
                  total: meta.checklistTotal,
                })
              : t('preview.sectionChecklistEmpty'),
          icon: 'checkbox-outline',
        };
      case 'costs':
        return {
          id,
          label: t('preview.sectionCosts'),
          hint: sections.costs ? t('preview.sectionCostsOn') : t('preview.sectionCostsOff'),
          icon: 'cash-outline',
        };
      case 'signature':
        return {
          id,
          label: t('preview.sectionSignature'),
          hint: t('preview.sectionSignatureHint'),
          icon: 'create-outline',
        };
      case 'review':
        return {
          id,
          label: t('preview.sectionReview'),
          hint: meta.hasReviewUrl
            ? t('preview.sectionReviewHint', {
                provider: REVIEW_PROVIDER_LABELS[meta.reviewProvider],
              })
            : t('preview.sectionReviewEmpty'),
          icon: 'qr-code-outline',
          pro: true,
        };
      default:
        return { id, label: id, hint: '', icon: 'ellipse-outline' };
    }
  });

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.labelRow}>
        <Text variant="bodyMedium" color={colors.textPrimary}>
          {t('preview.includeInPdf')}
        </Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('preview.dragToReorder')}
        </Text>
      </View>
      <View style={[styles.sectionsList, { borderColor: colors.border, backgroundColor: '#FAFBFA' }]}>
        {rows.map((row, index) => {
          const on = sections[row.id];
          const muted = !on;
          return (
            <View
              key={row.id}
              style={[
                styles.sectionRow,
                index < rows.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } : null,
              ]}
            >
              <View style={styles.reorderCol}>
                <Pressable
                  onPress={() => onMove(row.id, -1)}
                  disabled={index === 0}
                  accessibilityRole="button"
                  accessibilityLabel={t('preview.moveSectionUpA11y', { label: row.label })}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-up" size={14} color={index === 0 ? colors.border : colors.textTertiary} />
                </Pressable>
                <Ionicons name="menu" size={14} color={colors.textTertiary} />
                <Pressable
                  onPress={() => onMove(row.id, 1)}
                  disabled={index === rows.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel={t('preview.moveSectionDownA11y', { label: row.label })}
                  hitSlop={8}
                >
                  <Ionicons
                    name="chevron-down"
                    size={14}
                    color={index === rows.length - 1 ? colors.border : colors.textTertiary}
                  />
                </Pressable>
              </View>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: on ? colors.accentSoft : colors.surfaceSunken },
                ]}
              >
                <Ionicons name={row.icon} size={16} color={on ? colors.accent : colors.textSecondary} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <View style={styles.nameRow}>
                  <Text variant="bodyMedium" color={muted ? colors.textSecondary : colors.textPrimary}>
                    {row.label}
                  </Text>
                  {row.pro ? (
                    <View style={[styles.pill, { backgroundColor: colors.ctaDark }]}>
                      <Ionicons name="lock-closed" size={9} color={colors.textInverse} />
                      <Text variant="caption" color={colors.textInverse} style={styles.pillText}>
                        {t('reports.templatePickerProBadge')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
                  {row.hint}
                </Text>
              </View>
              <Switch
                value={on}
                onValueChange={(value) => {
                  if (row.pro && !isPro) {
                    onLocked();
                    return;
                  }
                  onToggle(row.id, value);
                }}
                trackColor={{ false: colors.borderStrong, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    gap: 4,
  },
  handleHit: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  templateName: {
    fontSize: 17,
    fontWeight: '600',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  allTemplatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  stripCard: {
    width: 52,
    height: 74,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  lockDot: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCard: {
    width: 52,
    height: 74,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  shareBtn: {
    width: 52,
    height: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentActive: {
    shadowColor: '#121412',
    shadowOpacity: 0.06,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '47.5%',
    gap: 6,
  },
  gridThumb: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandColourCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  monogram: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverChip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionsList: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reorderCol: {
    alignItems: 'center',
    gap: 0,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function businessInitialFromName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return 'T';
  return trimmed.charAt(0).toUpperCase();
}

export function parseTrayAccent(value: string | null | undefined): string {
  return parseAccentHex(value ?? '') ?? DEFAULT_ACCENT;
}

/** Keep section list helpers tree-shake friendly for tests. */
export const PREVIEW_TRAY_SECTION_IDS = REPORT_SECTION_IDS;
