import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { FLOATING_FIELD_HEIGHT, FloatingField, Modal, Text } from '@/components';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

import { JobCalendar } from './MonthCalendar';

type DateFieldProps = {
  label: string;
  value: string; // ISO yyyy-MM-dd
  onChange: (value: string) => void;
};

export function DateField({ label, value, onChange }: DateFieldProps) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(value) : new Date();
  const interactive = Platform.OS !== 'web';

  const commitDate = (selectedDate: Date) => {
    const offsetMs = selectedDate.getTimezoneOffset() * 60_000;
    onChange(new Date(selectedDate.getTime() - offsetMs).toISOString().slice(0, 10));
  };

  const handleValueChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    commitDate(selectedDate);
  };

  const handleDismiss = () => {
    setOpen(false);
  };

  return (
    <View>
      <FloatingField
        eyebrow={label}
        floated
        restingColor={colors.textTertiary}
        floatedColor={open ? colors.textPrimary : colors.textSecondary}
        borderColor={open ? colors.textPrimary : colors.border}
        backgroundColor={colors.surface}
        radius={radius.md}
        restOffset={(FLOATING_FIELD_HEIGHT - 20) / 2}
      >
        <Pressable
          onPress={interactive ? () => setOpen(true) : undefined}
          disabled={!interactive}
          hitSlop={{ top: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatDate(value)}`}
          style={[styles.field, { paddingHorizontal: spacing.md }]}
        >
          <Text variant="body">{formatDate(value)}</Text>
          {interactive ? <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} /> : null}
        </Pressable>
      </FloatingField>
      {open && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="inline"
          themeVariant="light"
          accentColor={colors.accent}
          // Inline ignores textColor. accentColor tints the selection and today marker.
          style={{ backgroundColor: colors.surface }}
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      ) : null}
      {open && Platform.OS === 'android' ? (
        <Modal visible onRequestClose={handleDismiss}>
          <JobCalendar
            value={value}
            onSelect={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
          />
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: FLOATING_FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
