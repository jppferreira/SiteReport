import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { LevelToolView } from '@/features/levelTool';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import { getArCapabilities } from './arCapabilities';

type MeasureMode = 'measure' | 'level';

type ArMeasureScreenProps = {
  jobId: string;
  areaId: string | null;
  onClose: () => void;
  onSaved: () => void;
  initialMode?: MeasureMode;
};

type SessionComponent = React.ComponentType<{
  jobId: string;
  areaId: string | null;
  capabilities: ReturnType<typeof getArCapabilities>;
  onClose: () => void;
  onSaved: () => void;
  headerSlot?: React.ReactNode;
}>;

function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: MeasureMode;
  onChange: (mode: MeasureMode) => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.modeRow}>
      <Pressable
        onPress={() => onChange('measure')}
        style={[styles.modeChip, mode === 'measure' && styles.modeChipActive]}
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'measure' }}
        accessibilityLabel={t('arMeasure.modeMeasure')}
      >
        <Ionicons
          name="resize-outline"
          size={16}
          color={mode === 'measure' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
        />
        <Text variant="caption" color={mode === 'measure' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}>
          {t('arMeasure.modeMeasure')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('level')}
        style={[styles.modeChip, mode === 'level' && styles.modeChipActive]}
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'level' }}
        accessibilityLabel={t('arMeasure.modeLevel')}
      >
        <Ionicons
          name="phone-landscape-outline"
          size={16}
          color={mode === 'level' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
        />
        <Text variant="caption" color={mode === 'level' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}>
          {t('arMeasure.modeLevel')}
        </Text>
      </Pressable>
    </View>
  );
}

/** Job measure tools — AR tape measure and spirit level. */
export function ArMeasureScreen({
  jobId,
  areaId,
  onClose,
  onSaved,
  initialMode = 'measure',
}: ArMeasureScreenProps) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const caps = useMemo(() => getArCapabilities(), []);
  const [mode, setMode] = useState<MeasureMode>(
    initialMode === 'measure' && !caps.arSupported ? 'level' : initialMode
  );
  const [Session, setSession] = useState<SessionComponent | null>(null);
  const [loadError, setLoadError] = useState(false);

  React.useEffect(() => {
    if (!caps.arSupported || mode !== 'measure') return;
    let cancelled = false;
    // Lazy-load so Expo Go / unlinked builds never evaluate @stewmore/expo-ar.
    import('./ArMeasureSession')
      .then((mod) => {
        if (!cancelled) setSession(() => mod.ArMeasureSession);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [caps.arSupported, mode]);

  const topBar = (
    <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.iconChip}>
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </Pressable>
      <ModeSwitcher mode={mode} onChange={setMode} />
      <View style={{ width: 40 }} />
    </View>
  );

  if (mode === 'level') {
    return (
      <View style={[styles.fill, { backgroundColor: '#0B0D0B' }]}>
        {topBar}
        <LevelToolView active topReserve={insets.top + 56} />
      </View>
    );
  }

  if (!caps.arSupported || loadError) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={[styles.topBarLight, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.modeRowLight}>
            <Pressable
              onPress={() => setMode('measure')}
              style={[styles.modeChipLight, styles.modeChipLightActive, { backgroundColor: colors.accent }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: true }}
            >
              <Text variant="caption" color={colors.accentOnAccent}>
                {t('arMeasure.modeMeasure')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('level')}
              style={[styles.modeChipLight, { backgroundColor: colors.surfaceSunken }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
            >
              <Text variant="caption" color={colors.textSecondary}>
                {t('arMeasure.modeLevel')}
              </Text>
            </Pressable>
          </View>
          <View style={{ width: 28 }} />
        </View>
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md }}>
          <Text variant="h2">{t('arMeasure.unsupportedTitle')}</Text>
          <Text variant="body" color={colors.textSecondary}>
            {t('arMeasure.unsupportedBody')}
          </Text>
          <Text variant="bodySmall" color={colors.textTertiary}>
            {t('arMeasure.rebuildHint')}
          </Text>
          <Button label={t('arMeasure.tryLevel')} onPress={() => setMode('level')} />
          <Button label={t('common.goBack')} variant="secondary" onPress={onClose} />
        </View>
      </View>
    );
  }

  if (!Session) {
    return (
      <View style={[styles.fill, { backgroundColor: '#000' }]}>
        {topBar}
      </View>
    );
  }

  return (
    <Session
      jobId={jobId}
      areaId={areaId}
      capabilities={caps}
      onClose={onClose}
      onSaved={onSaved}
      headerSlot={<ModeSwitcher mode={mode} onChange={setMode} />}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    position: 'absolute',
    zIndex: 2,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topBarLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeRowLight: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modeChipActive: {
    backgroundColor: 'rgba(255,90,54,0.9)',
  },
  modeChipLight: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  modeChipLightActive: {},
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
