import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CrewAvatar, NavigationHeader, Screen, Text } from '@/components';
import { useCrewAvatar } from '@/hooks/useCrewAvatar';
import { useI18n } from '@/i18n/useI18n';
import {
  CREW_BEARD_OPTIONS,
  CREW_BG_COLORS,
  CREW_GLASSES_OPTIONS,
  CREW_HAIR_OPTIONS,
  CREW_HAT_OPTIONS,
  CREW_SKIN_OPTIONS,
  CREW_TOP_OPTIONS,
  type CrewAvatarComposition,
} from '@/models';
import { useTheme } from '@/theme';

type BuilderTab = 'skin' | 'hair' | 'beard' | 'top' | 'glasses' | 'hat' | 'bg';

const TABS: BuilderTab[] = ['skin', 'hair', 'beard', 'top', 'glasses', 'hat', 'bg'];

export default function AvatarSettingsScreen() {
  const { colors, radius, spacing } = useTheme();
  const { t } = useI18n();
  const [composition, patchComposition] = useCrewAvatar();
  const [tab, setTab] = useState<BuilderTab>('hair');

  const tabLabel = (id: BuilderTab) => {
    switch (id) {
      case 'skin':
        return t('settings.avatarTabSkin');
      case 'hair':
        return t('settings.avatarTabHair');
      case 'beard':
        return t('settings.avatarTabBeard');
      case 'top':
        return t('settings.avatarTabTop');
      case 'glasses':
        return t('settings.avatarTabGlasses');
      case 'hat':
        return t('settings.avatarTabHat');
      case 'bg':
        return t('settings.avatarTabBg');
    }
  };

  const options = useMemo(() => {
    switch (tab) {
      case 'skin':
        return CREW_SKIN_OPTIONS.map((option) => ({
          id: option.id,
          source: option.source,
          selected: composition.skinId === option.id,
          onPress: () => patchComposition({ skinId: option.id }),
          swatch: null as string | null,
        }));
      case 'hair':
        return CREW_HAIR_OPTIONS.map((option) => ({
          id: option.id,
          source: option.source,
          selected: composition.hairId === option.id,
          onPress: () => patchComposition({ hairId: option.id }),
          swatch: null as string | null,
        }));
      case 'beard':
        return CREW_BEARD_OPTIONS.map((option) => ({
          id: option.id,
          source: option.source,
          selected: composition.beardId === option.id,
          onPress: () => patchComposition({ beardId: option.id }),
          swatch: null as string | null,
        }));
      case 'top':
        return CREW_TOP_OPTIONS.map((option) => ({
          id: option.id,
          source: option.source,
          selected: composition.topId === option.id,
          onPress: () => patchComposition({ topId: option.id }),
          swatch: null as string | null,
        }));
      case 'glasses':
        return CREW_GLASSES_OPTIONS.map((option) => ({
          id: option.id,
          source: option.source,
          selected: composition.glassesId === option.id,
          onPress: () => patchComposition({ glassesId: option.id }),
          swatch: null as string | null,
        }));
      case 'hat':
        return CREW_HAT_OPTIONS.map((option) => ({
          id: option.id,
          source: option.source,
          selected: composition.hatId === option.id,
          onPress: () => patchComposition({ hatId: option.id }),
          swatch: null as string | null,
        }));
      case 'bg':
        return CREW_BG_COLORS.map((color) => ({
          id: color,
          source: null,
          selected: composition.backgroundColor === color,
          onPress: () => patchComposition({ backgroundColor: color }),
          swatch: color,
        }));
    }
  }, [composition, patchComposition, tab]);

  return (
    <Screen>
      <NavigationHeader title={t('settings.avatarTitle')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text variant="body" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
          {t('settings.avatarDescription')}
        </Text>

        <View style={[styles.previewWrap, { marginBottom: spacing.xl }]}>
          <CrewAvatar composition={composition} size={128} borderColor={colors.border} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.lg }}
        >
          {TABS.map((id) => {
            const active = id === tab;
            return (
              <Pressable
                key={id}
                onPress={() => setTab(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    backgroundColor: active ? colors.accent : colors.surfaceSunken,
                    borderRadius: radius.pill,
                    opacity: pressed ? 0.9 : 1,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  color={active ? colors.accentOnAccent : colors.textSecondary}
                  style={{ fontWeight: '600' }}
                >
                  {tabLabel(id)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.grid}>
          {options.map((option) => (
            <Pressable
              key={option.id}
              onPress={option.onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: option.selected }}
              accessibilityLabel={t('settings.avatarOptionA11y', { id: option.id })}
              style={({ pressed }) => [
                styles.cell,
                {
                  borderRadius: radius.lg,
                  borderColor: option.selected ? colors.accent : colors.border,
                  borderWidth: option.selected ? 2 : StyleSheet.hairlineWidth,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {option.swatch ? (
                <View
                  style={[styles.swatch, { backgroundColor: option.swatch, borderColor: colors.border }]}
                />
              ) : option.source ? (
                <OptionThumb tab={tab} composition={composition} source={option.source} optionId={option.id} />
              ) : (
                <View style={[styles.noneSlot, { borderColor: colors.border }]}>
                  <Text variant="caption" color={colors.textSecondary}>
                    {t('settings.avatarNone')}
                  </Text>
                </View>
              )}
              {option.selected ? (
                <View
                  style={[styles.check, { backgroundColor: colors.accent, borderColor: colors.surface }]}
                >
                  <Ionicons name="checkmark" size={12} color={colors.accentOnAccent} />
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function OptionThumb({
  tab,
  composition,
  source,
  optionId,
}: {
  tab: BuilderTab;
  composition: CrewAvatarComposition;
  source: NonNullable<React.ComponentProps<typeof Image>['source']>;
  optionId: string;
}) {
  if (tab === 'skin') {
    return (
      <CrewAvatar
        composition={{
          ...composition,
          skinId: optionId as CrewAvatarComposition['skinId'],
          hairId: 'hair-none',
          beardId: 'beard-none',
          glassesId: 'glasses-none',
          hatId: 'hat-none',
        }}
        size={56}
      />
    );
  }
  if (tab === 'hair') {
    return (
      <CrewAvatar
        composition={{
          ...composition,
          hairId: optionId as CrewAvatarComposition['hairId'],
          hatId: 'hat-none',
        }}
        size={56}
      />
    );
  }
  if (tab === 'beard') {
    return (
      <CrewAvatar
        composition={{ ...composition, beardId: optionId as CrewAvatarComposition['beardId'] }}
        size={56}
      />
    );
  }
  if (tab === 'glasses') {
    return (
      <CrewAvatar
        composition={{ ...composition, glassesId: optionId as CrewAvatarComposition['glassesId'] }}
        size={56}
      />
    );
  }
  if (tab === 'hat') {
    return (
      <CrewAvatar
        composition={{ ...composition, hatId: optionId as CrewAvatarComposition['hatId'] }}
        size={56}
      />
    );
  }
  return (
    <View style={[styles.thumb, { backgroundColor: composition.backgroundColor }]}>
      <Image source={source} style={styles.thumbFill} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

const styles = StyleSheet.create({
  previewWrap: { alignItems: 'center' },
  tab: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '30%',
    minWidth: 96,
    flexGrow: 1,
    maxWidth: 120,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: 6,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFill: { width: 56, height: 56 },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noneSlot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
