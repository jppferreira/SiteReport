export type ValidationResult = { valid: true } | { valid: false; message: string };

export function validateJobTitle(title: string): ValidationResult {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Give the job a title to continue.' };
  }
  if (trimmed.length > 120) {
    return { valid: false, message: 'Job title must be under 120 characters.' };
  }
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (trimmed.length === 0) return { valid: true };
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(trimmed)) {
    return { valid: false, message: 'Enter a valid email address.' };
  }
  return { valid: true };
}

export function validateBusinessName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length > 120) {
    return { valid: false, message: 'Business name must be under 120 characters.' };
  }
  return { valid: true };
}
