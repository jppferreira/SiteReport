import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { TranslateOptions } from 'i18n-js';

import {
  getLocale,
  i18n,
  setLocale as setI18nLocale,
  type AppLocale,
  type TranslationKey,
} from './index';

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppLocale {
  return getLocale();
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** React hook: `t` re-renders when the active locale changes. */
export function useI18n() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setLocale = useCallback((next: AppLocale) => {
    setI18nLocale(next);
    notify();
  }, []);

  const translate = useCallback(
    (key: TranslationKey, options?: TranslateOptions) => i18n.t(key, options),
    // locale is intentional: new identity when language changes so callers refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  return useMemo(
    () => ({
      t: translate,
      locale,
      setLocale,
    }),
    [translate, locale, setLocale]
  );
}
