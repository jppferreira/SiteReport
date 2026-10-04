import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave for a single text field. Keeps local state responsive
 * while persisting to disk shortly after the user stops typing, and flushes
 * immediately on blur/unmount so backgrounding the app never loses work.
 */
export function useAutosaveField(
  initialValue: string,
  onSave: (value: string) => Promise<void>,
  delayMs = 600
) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef(initialValue);
  const savedValue = useRef(initialValue);

  useEffect(() => {
    setValue(initialValue);
    latestValue.current = initialValue;
    savedValue.current = initialValue;
  }, [initialValue]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (latestValue.current === savedValue.current) return;
    setStatus('saving');
    try {
      await onSave(latestValue.current);
      savedValue.current = latestValue.current;
      setStatus('saved');
    } catch {
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSave]);

  const onChange = useCallback(
    (next: string) => {
      setValue(next);
      latestValue.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        flush();
      }, delayMs);
    },
    [delayMs, flush]
  );

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (latestValue.current !== savedValue.current) {
          // Best-effort synchronous-ish flush on unmount (e.g. navigating back).
          onSave(latestValue.current).catch(() => undefined);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { value, onChange, status, flush };
}
