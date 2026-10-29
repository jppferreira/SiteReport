/**
 * Logging wrapper that is a strict no-op in production builds.
 *
 * Never pass customer names, addresses, notes, signature data, or report
 * contents to these functions, even in development — grep this file's
 * call sites during review to confirm.
 *
 * Production builds do not report crashes. A crash service would send stack
 * traces and file paths, which can include job identifiers. The only support
 * channel is the bug report a person chooses to send from Settings.
 */
const isDev = __DEV__;

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (!isDev) return;
    console.log(`[Trade Report] ${message}`, context ?? '');
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (!isDev) return;
    console.warn(`[Trade Report] ${message}`, context ?? '');
  },
  error(message: string, error?: unknown) {
    if (!isDev) return;
    console.error(`[Trade Report] ${message}`, error ?? '');
  },
};
