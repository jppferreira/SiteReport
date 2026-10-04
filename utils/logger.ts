/**
 * Logging wrapper that is a strict no-op in production builds.
 *
 * Never pass customer names, addresses, notes, signature data, or report
 * contents to these functions, even in development — grep this file's
 * call sites during review to confirm.
 */
const isDev = __DEV__;

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (!isDev) return;
    // eslint-disable-next-line no-console
    console.log(`[SiteReport] ${message}`, context ?? '');
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (!isDev) return;
    // eslint-disable-next-line no-console
    console.warn(`[SiteReport] ${message}`, context ?? '');
  },
  error(message: string, error?: unknown) {
    if (!isDev) return;
    // eslint-disable-next-line no-console
    console.error(`[SiteReport] ${message}`, error ?? '');
  },
};
