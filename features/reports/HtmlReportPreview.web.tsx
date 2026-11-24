import React, { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';

import { parsePreviewEditMessage, type ReportPreviewEditEvent } from '@/features/reports/previewEdit';
import { useI18n } from '@/i18n/useI18n';

type HtmlReportPreviewProps = {
  html: string;
  onEdit?: (event: ReportPreviewEditEvent) => void;
};

/** Renders the same HTML the PDF is printed from, before the file is saved. */
export function HtmlReportPreview({ html, onEdit }: HtmlReportPreviewProps) {
  const { t } = useI18n();
  const frameName = useId();

  useEffect(() => {
    if (!onEdit) return;
    const onMessage = (event: MessageEvent) => {
      const next = parsePreviewEditMessage(event.data);
      if (next) onEdit(next);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onEdit]);

  return (
    <View style={styles.frame}>
      {React.createElement('iframe', {
        title: t('reports.htmlPreviewTitle'),
        name: frameName,
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
