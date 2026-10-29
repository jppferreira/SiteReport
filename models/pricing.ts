export const PRICING_CATEGORIES = ['materials', 'labour', 'other'] as const;

export type PricingCategory = (typeof PRICING_CATEGORIES)[number];

export const PRICING_CATEGORY_LABELS: Record<PricingCategory, string> = {
  materials: 'Materials',
  labour: 'Labour',
  other: 'Other',
};

export type PricingLine = {
  id: string;
  description: string;
  category: PricingCategory;
  /** Amount as typed, in pounds, e.g. "85" or "120.50". */
  amount: string;
};

/** Optional figures attached to a job report. A reference, not an invoice. */
export type ReportPricing = {
  enabled: boolean;
  lines: PricingLine[];
};

export const EMPTY_PRICING: ReportPricing = { enabled: false, lines: [] };

const MAX_LINES = 40;
const MAX_DESCRIPTION = 160;

export function isPricingCategory(value: unknown): value is PricingCategory {
  return typeof value === 'string' && (PRICING_CATEGORIES as readonly string[]).includes(value);
}

/** Keeps digits and a single decimal point, with at most two decimal places. */
export function sanitizeAmountInput(value: string): string {
  let next = '';
  let seenDot = false;
  let decimals = 0;
  for (const char of value.replace(/[£,\s]/g, '')) {
    if (char >= '0' && char <= '9') {
      if (seenDot) {
        if (decimals >= 2) continue;
        decimals += 1;
      }
      next += char;
    } else if (char === '.' && !seenDot) {
      seenDot = true;
      next += char;
    }
    if (next.length >= 12) break;
  }
  return next;
}

/** Parses a typed pound amount into pence, or null when it is not a number yet. */
export function parseAmountToPence(amount: string): number | null {
  const cleaned = sanitizeAmountInput(amount);
  if (!cleaned || cleaned === '.') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole = '0', frac = ''] = cleaned.split('.');
  const pounds = Number(whole);
  if (!Number.isSafeInteger(pounds)) return null;
  const pence = Number((frac + '00').slice(0, 2));
  const total = pounds * 100 + pence;
  if (!Number.isSafeInteger(total)) return null;
  return total;
}

/** Formats pence as a British pound amount, e.g. "£1,240.50". */
export function formatPence(pence: number): string {
  const negative = pence < 0;
  const abs = Math.abs(Math.trunc(pence));
  const pounds = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${negative ? '-' : ''}£${pounds.toLocaleString('en-GB')}.${String(remainder).padStart(2, '0')}`;
}

export function pricingTotalPence(lines: PricingLine[]): number | null {
  let total = 0;
  let any = false;
  for (const line of lines) {
    const pence = parseAmountToPence(line.amount);
    if (pence === null) continue;
    any = true;
    total += pence;
  }
  return any ? total : null;
}

/** Lines that should appear on the report: the toggle is on, and the row has a name or an amount. */
export function linesForReport(pricing: ReportPricing | null | undefined): PricingLine[] {
  if (!pricing?.enabled) return [];
  return pricing.lines.filter(
    (line) => line.description.trim().length > 0 || parseAmountToPence(line.amount) !== null
  );
}

export function blankPricingLine(id: string, category: PricingCategory = 'materials'): PricingLine {
  return { id, description: '', category, amount: '' };
}

export function parsePricing(raw: unknown): ReportPricing {
  let value = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return EMPTY_PRICING;
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return EMPTY_PRICING;
    }
  }
  if (!value || typeof value !== 'object') return EMPTY_PRICING;

  const record = value as Record<string, unknown>;
  const linesRaw = Array.isArray(record.lines) ? record.lines : [];
  const lines: PricingLine[] = [];
  for (const item of linesRaw) {
    if (!item || typeof item !== 'object') continue;
    const line = item as Record<string, unknown>;
    const id = typeof line.id === 'string' ? line.id.trim().slice(0, 80) : '';
    if (!id) continue;
    const description = typeof line.description === 'string' ? line.description.slice(0, MAX_DESCRIPTION) : '';
    const category = isPricingCategory(line.category) ? line.category : 'other';
    lines.push({ id, description, category, amount: sanitizeAmountInput(String(line.amount ?? '')) });
    if (lines.length >= MAX_LINES) break;
  }

  return { enabled: record.enabled === true, lines };
}

export function serializePricing(pricing: ReportPricing): string {
  return JSON.stringify(parsePricing(pricing));
}
