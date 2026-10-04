export const validateJobTitle = (title: string) => {
  const trimmed = title.trim();
  if (!trimmed) {
    return 'Job title is required';
  }
  if (trimmed.length > 120) {
    return 'Job title is too long';
  }
  return null;
};
