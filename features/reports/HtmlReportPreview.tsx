import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { parsePreviewEditMessage, type ReportPreviewEditEvent } from '@/features/reports/previewEdit';

export type { ReportPreviewEditAction, ReportPreviewEditEvent } from '@/features/reports/previewEdit';

type HtmlReportPreviewProps = {
  html: string;
  onEdit?: (event: ReportPreviewEditEvent) => void;
};

/** Cheap stable key so Android remounts when the HTML source changes. */
function htmlSourceKey(html: string): string {
  let hash = 0;
  for (let index = 0; index < html.length; index += 17) {
    hash = (hash * 31 + html.charCodeAt(index)) | 0;
  }
  return `${html.length}:${hash}`;
}

/** Renders the same HTML the PDF is printed from, before the file is saved. */
export function HtmlReportPreview({ html, onEdit }: HtmlReportPreviewProps) {
  // Android's WebView often ignores `source={{ html }}` updates unless the
  // view remounts, so Full width ↔ Compact looked like it did nothing.
  const sourceKey = useMemo(() => htmlSourceKey(html), [html]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (!onEdit) return;
      const next = parsePreviewEditMessage(event.nativeEvent.data);
      if (next) onEdit(next);
    },
    [onEdit]
  );

  return (
    <WebView
      key={sourceKey}
      originWhitelist={['*']}
      source={{ html }}
      style={styles.frame}
      // Android's WebView otherwise lays the A4 page out on a ~980px viewport
      // and zooms it out again, so the cover is clipped or unreadably small.
      scalesPageToFit={false}
      textZoom={100}
      nestedScrollEnabled
      setBuiltInZoomControls={false}
      showsVerticalScrollIndicator
      androidLayerType="software"
      onMessage={handleMessage}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 280,
    backgroundColor: '#ffffff',
  },
});
