import { format, isToday, parseISO } from 'date-fns';

export const nowIso = (): string => new Date().toISOString();

export const formatJobDate = (isoDate: string): string => {
  const parsed = parseISO(isoDate);
  if (isToday(parsed)) {
    return 'Today';
  }

  return format(parsed, 'd MMM yyyy');
};

export const toFileDate = (isoDate: string): string => format(parseISO(isoDate), 'yyyy-MM-dd');
