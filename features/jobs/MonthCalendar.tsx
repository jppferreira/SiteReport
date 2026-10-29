import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { IconButton, Text, TextButton } from '@/components';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/theme';

import {
  type CalendarCell,
  buildMonthGrid,
  formatCalendarDate,
  monthTitle,
  parseIsoDate,
  shiftMonth,
  toIsoDate,
} from './jobCalendar';

const WEEKDAY_KEYS = [
  'jobs.weekdayMon',
  'jobs.weekdayTue',
  'jobs.weekdayWed',
  'jobs.weekdayThu',
  'jobs.weekdayFri',
  'jobs.weekdaySat',
  'jobs.weekdaySun',
] as const;

type JobCalendarProps = {
  value: string;
  onSelect: (iso: string) => void;
};

export function JobCalendar({ value, onSelect }: JobCalendarProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const { t } = useI18n();
  const selected = parseIsoDate(value);
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const cells = buildMonthGrid(cursor.year, cursor.month);
  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  const today = toIsoDate(new Date());

  const choose = (iso: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onSelect(iso);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          padding: spacing.lg,
        },
        shadows.card,
      ]}
    >
      <View style={styles.header}>
        <IconButton
          name="chevron-back"
          variant="ghost"
          accessibilityLabel={t('jobs.calendarPreviousMonth')}
          onPress={() => setCursor((current) => shiftMonth(current.year, current.month, -1))}
        />
        <Text variant="h3" accessibilityRole="header" style={styles.title}>
          {monthTitle(cursor.year, cursor.month)}
        </Text>
        <IconButton
          name="chevron-forward"
          variant="ghost"
          accessibilityLabel={t('jobs.calendarNextMonth')}
          onPress={() => setCursor((current) => shiftMonth(current.year, current.month, 1))}
        />
      </View>

      <View style={[styles.week, { marginTop: spacing.md }]}>
        {WEEKDAY_KEYS.map((key) => (
          <View key={key} style={styles.cell}>
            <Text variant="caption" color={colors.textTertiary}>
              {t(key)}
            </Text>
          </View>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]?.iso} style={styles.week}>
          {week.map((cell) => {
            const isSelected = cell.iso === value;
            const isToday = cell.iso === today;
            const color = isSelected
              ? colors.accentOnAccent
              : !cell.inMonth
                ? colors.textTertiary
                : isToday
                  ? colors.accentPressed
                  : colors.textPrimary;
            return (
              <Pressable
                key={cell.iso}
                accessibilityRole="button"
                accessibilityLabel={formatCalendarDate(cell.iso)}
                accessibilityState={{ selected: isSelected }}
                onPress={() => choose(cell.iso)}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.day,
                    isSelected ? { backgroundColor: colors.accent } : null,
                    isToday && !isSelected ? { borderWidth: 1.5, borderColor: colors.accent } : null,
                  ]}
                >
                  <Text variant="bodySmall" color={color}>
                    {cell.day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <TextButton label={t('jobs.calendarToday')} tone="accent" onPress={() => choose(today)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
