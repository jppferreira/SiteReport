import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type HtmlReportPreviewProps = {
  html: string;
};

/** Renders the same HTML the PDF is printed from, before the file is saved. */
export function HtmlReportPreview({ html }: HtmlReportPreviewProps) {
  return (
    <WebView
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
