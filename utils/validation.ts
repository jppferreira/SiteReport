import { t } from '@/i18n';

export type ValidationResult = { valid: true } | { valid: false; message: string };

export function validateJobTitle(title: string): ValidationResult {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: t('validation.jobTitleRequired') };
  }
  if (trimmed.length > 120) {
    return { valid: false, message: t('validation.jobTitleTooLong') };
  }
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (trimmed.length === 0) return { valid: true };
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(trimmed)) {
    return { valid: false, message: t('validation.emailInvalid') };
  }
  return { valid: true };
}

export function validateBusinessName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length > 120) {
    return { valid: false, message: t('validation.businessNameTooLong') };
  }
  return { valid: true };
}
