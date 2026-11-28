import React from 'react';
import { useI18n } from '@/i18n/useI18n';

import { GenericDetailPane } from './GenericDetailPane';

export function LanguageDetailPane() {
  const { t, locale } = useI18n();

  const languageLabel = locale.startsWith('en') ? 'English' : locale === 'es' ? 'Español' : 'English';

  return (
    <GenericDetailPane
      title={t('settings.language')}
      subtitle={t('language.subtitle')}
      items={[{ label: t('language.selected'), value: languageLabel }]}
      fullScreenHref="/settings/language"
    />
  );
}
