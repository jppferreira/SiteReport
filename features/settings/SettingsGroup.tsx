import React, { Children, Fragment, isValidElement } from 'react';
import { View } from 'react-native';

import { Card, Divider, Text } from '@/components';
import { useTheme } from '@/theme';

type SettingsGroupProps = {
  title?: string;
  children: React.ReactNode;
};

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  const { colors, spacing } = useTheme();
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <View style={{ marginBottom: spacing.xl }}>
      {title ? (
        <Text
          variant="label"
          color={colors.textSecondary}
          style={{ marginBottom: spacing.xs, marginLeft: spacing.xxs, textTransform: 'uppercase' }}
        >
          {title}
        </Text>
      ) : null}
      <Card padded style={{ paddingVertical: 4, paddingHorizontal: spacing.md }}>
        {items.map((item, index) => (
          <Fragment key={index}>
            {item}
            {index < items.length - 1 ? <Divider /> : null}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}
