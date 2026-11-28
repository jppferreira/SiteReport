import React from 'react';
import { useI18n } from '@/i18n/useI18n';

import { GenericDetailPane } from './GenericDetailPane';

export function AppearanceDetailPane() {
  const { t } = useI18n();

  return (
    <GenericDetailPane
      title={t('settings.appearance')}
      subtitle={t('appearance.subtitle')}
      items={[{ label: t('appearance.theme'), value: t('appearance.themeSystem') }]}
      fullScreenHref="/settings/appearance"
    />
  );
}
