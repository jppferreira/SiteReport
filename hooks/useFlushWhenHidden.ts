import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Runs `flush` when the app leaves the foreground and again when the
 * calling component unmounts, so a pending local save is not lost if the
 * device sleeps or the screen closes.
 */
export function useFlushWhenHidden(flush: () => void) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        flush();
      }
    });
    return () => {
      subscription.remove();
      flush();
    };
  }, [flush]);
}
