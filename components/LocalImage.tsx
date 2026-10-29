import { Image, ImageContentFit, ImageStyle } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Platform, StyleProp } from 'react-native';

import { displayUri } from '@/services/fileService';
import { fileUriReadCandidates } from '@/services/fileUri';

type LocalImageProps = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
};

/**
 * Renders a photo, logo or signature that lives in app storage.
 * On the web those files are kept in IndexedDB, so the stored path has to
 * be turned into a local blob URL before it can be shown.
 */
export function LocalImage({ uri, style, contentFit = 'cover' }: LocalImageProps) {
  const [resolved, setResolved] = useState<string | null>(Platform.OS === 'web' ? null : uri);
  const [attempt, setAttempt] = useState(0);
  const [loadedUri, setLoadedUri] = useState(uri);
  if (uri !== loadedUri) {
    setLoadedUri(uri);
    setAttempt(0);
    setResolved(Platform.OS === 'web' ? null : uri);
  }
  const candidates = Platform.OS === 'web' || !resolved ? [resolved] : fileUriReadCandidates(resolved);
  const source = candidates[Math.min(attempt, Math.max(candidates.length - 1, 0))] ?? null;

  useEffect(() => {
    let cancelled = false;
    displayUri(uri).then((next) => {
      if (!cancelled) setResolved(next);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!source) return null;
  return (
    <Image
      key={`${source}:${attempt}`}
      source={{ uri: source }}
      style={style}
      contentFit={contentFit}
      onError={() => {
        setAttempt((current) => (current < candidates.length - 1 ? current + 1 : current));
      }}
    />
  );
}
