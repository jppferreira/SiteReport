import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

type DateFieldProps = {
  label: string;
  value: string; // ISO yyyy-MM-dd
  onChange: (value: string) => void;
};

export function DateField({ label, value, onChange }: DateFieldProps) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const dateValue = value ? new Date(value) : new Date();

  if (Platform.OS === 'web') {
    // @react-native-community/datetimepicker has no web implementation; the
    // native iOS/Android pickers below are this field's primary experience.
    return (
      <View>
        <Text variant="label" color={colors.textSecondary} style={{ marginBottom: 6 }}>
          {label}
        </Text>
        <View
          style={[
            styles.field,
            { borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
          ]}
        >
          <Text variant="body">{formatDate(value)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text variant="label" color={colors.textSecondary} style={{ marginBottom: 6 }}>
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value)}`}
        style={[
          styles.field,
          { borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
        ]}
      >
        <Text variant="body">{formatDate(value)}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selectedDate) => {
            setOpen(Platform.OS === 'ios');
            if (event.type === 'dismissed') {
              setOpen(false);
              return;
            }
            if (selectedDate) {
              const offsetMs = selectedDate.getTimezoneOffset() * 60_000;
              onChange(new Date(selectedDate.getTime() - offsetMs).toISOString().slice(0, 10));
            }
            if (Platform.OS === 'android') setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
