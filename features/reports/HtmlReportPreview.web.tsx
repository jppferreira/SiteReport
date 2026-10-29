import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';

type HtmlReportPreviewProps = {
  html: string;
};

/** Renders the same HTML the PDF is printed from, before the file is saved. */
export function HtmlReportPreview({ html }: HtmlReportPreviewProps) {
  const { t } = useI18n();
  return (
    <View style={styles.frame}>
      {React.createElement('iframe', {
        title: t('reports.htmlPreviewTitle'),
        srcDoc: html,
        style: {
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#ffffff',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 280,
  },
});
