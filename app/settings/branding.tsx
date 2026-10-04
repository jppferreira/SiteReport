import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Input, NavigationHeader, Screen, StatusBadge, Text, TextButton } from '@/components';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useTheme } from '@/theme';

const ACCENT_OPTIONS = ['#34D058', '#0EA5E9', '#F59E0B', '#8B5CF6', '#EF4444', '#101310'];

export default function BrandingScreen() {
  const { colors, radius, spacing } = useTheme();
  const { profile, loading, save } = useBusinessProfile();
  const { isPro } = useEntitlement();

  const [footerMessage, setFooterMessage] = useState('');
  const [accentColor, setAccentColor] = useState(ACCENT_OPTIONS[0]);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile && !hydrated.current) {
      setFooterMessage(profile.footerMessage ?? '');
      setAccentColor(profile.accentColor || ACCENT_OPTIONS[0]!);
      hydrated.current = true;
    }
  }, [profile]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save({ footerMessage });
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [footerMessage, save]);

  const handleSelectAccent = async (color: string) => {
    if (!isPro) {
      router.push({ pathname: '/paywall', params: { trigger: 'branding' } });
      return;
    }
    setAccentColor(color);
    await save({ accentColor: color });
  };

  if (loading) return null;

  return (
    <Screen>
      <NavigationHeader
        title="Report branding"
        onBack={() => router.back()}
        right={<TextButton label="Done" onPress={() => router.back()} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl }}>
        <View>
          <View style={styles.labelRow}>
            <Text variant="label" color={colors.textSecondary}>
              ACCENT COLOUR
            </Text>
            {!isPro ? <StatusBadge label="PRO" tone="accent" /> : null}
          </View>
          <View style={[styles.swatchRow, { marginTop: spacing.sm, gap: spacing.sm }]}>
            {ACCENT_OPTIONS.map((color) => {
              const selected = isPro && color === accentColor;
              return (
                <Pressable
                  key={color}
                  onPress={() => handleSelectAccent(color)}
                  accessibilityRole="button"
                  accessibilityLabel={`Accent colour ${color}`}
                  style={[
                    styles.swatch,
                    { backgroundColor: color, borderRadius: radius.pill, borderWidth: selected ? 3 : 0, borderColor: colors.textPrimary },
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </Pressable>
              );
            })}
          </View>
          {!isPro ? (
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              Reports use the default SiteReport green until you upgrade to Pro.
            </Text>
          ) : null}
        </View>

        <View>
          <Input
            label="Footer message"
            placeholder="e.g. Thank you for choosing Smith Plumbing."
            value={footerMessage}
            onChangeText={setFooterMessage}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="label" color={colors.textSecondary}>
            LOGO ON REPORTS
          </Text>
          {!isPro ? <StatusBadge label="PRO" tone="accent" /> : <StatusBadge label="ENABLED" tone="success" />}
        </View>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: -spacing.md }}>
          {isPro
            ? 'Your logo (set in Business profile) appears on every generated report.'
            : 'Add a logo in Business profile — upgrade to Pro to show it on your reports.'}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  swatchRow: { flexDirection: 'row' },
  swatch: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
