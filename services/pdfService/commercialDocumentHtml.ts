/**
 * Branded quote / invoice PDF layouts (Figma Feature Concepts · Classic / Bold / Minimal).
 * Standalone commercial sheets — not the full job report templates.
 */

import {
  COMMERCIAL_ACCENT_FALLBACK,
  DOCUMENT_TYPE_LABELS,
  VAT_RATE_PERCENT,
  displayReviewUrl,
  formatPence,
  linesForReport,
  normalizeCommercialTemplateId,
  normalizeDocumentType,
  parseAmountToPence,
  pricingVatBreakdown,
  type CommercialTemplateId,
  type DocumentType,
} from '@/models';
import { formatDate, formatDateShort } from '@/utils/format';

import { reviewQrDataUri } from './qrSvg';
import type { ReportHtmlInput, ReportInvoiceDetails } from './types';

const INK = '#121412';
const MUTED = '#5c665e';
const LINE = '#dbe3de';
const LINE_SOFT = '#d6e0d9';
const STRIPE_PURPLE = '#635BFF';
const HEADER_DARK = '#121412';
const HEADER_MUTED = '#c9d9cc';
const ZEBRA = '#f7faf9';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isCommercialDocumentType(type: DocumentType | null | undefined): boolean {
  const normalized = normalizeDocumentType(type);
  return normalized === 'quote' || normalized === 'invoice';
}

function resolveAccent(input: ReportHtmlInput): string {
  const raw = input.business.accentColor?.trim();
  if (raw && /^#[0-9A-Fa-f]{6}$/.test(raw)) return raw;
  return COMMERCIAL_ACCENT_FALLBACK;
}

function softAccent(hex: string): string {
  return `color-mix(in srgb, ${hex} 12%, #ffffff)`;
}

function contactLine(input: ReportHtmlInput): string {
  const parts = [input.business.email?.trim(), input.business.phone?.trim()].filter(Boolean);
  return parts.join('  ·  ');
}

function documentNumber(input: ReportHtmlInput, type: 'quote' | 'invoice'): string {
  if (type === 'invoice') {
    return input.invoice?.invoiceNumber ?? input.quote?.quoteNumber ?? '';
  }
  return input.quote?.quoteNumber ?? '';
}

function splitLineDescription(description: string): { title: string; detail: string | null } {
  const trimmed = description.trim();
  if (!trimmed) return { title: '—', detail: null };
  const nl = trimmed.indexOf('\n');
  if (nl >= 0) {
    const title = trimmed.slice(0, nl).trim() || '—';
    const detail = trimmed.slice(nl + 1).trim() || null;
    return { title, detail };
  }
  const sep = trimmed.indexOf(' · ');
  if (sep >= 0) {
    const title = trimmed.slice(0, sep).trim() || '—';
    const detail = trimmed.slice(sep + 3).trim() || null;
    return { title, detail };
  }
  return { title: trimmed, detail: null };
}

function lineRowsHtml(input: ReportHtmlInput, template: CommercialTemplateId): string {
  const lines = linesForReport(input.pricing);
  if (lines.length === 0) {
    return `<div class="comm-empty">No price lines yet</div>`;
  }
  return lines
    .map((line, index) => {
      const pence = parseAmountToPence(line.amount);
      const { title, detail } = splitLineDescription(line.description);
      const zebra = template === 'bold' && index % 2 === 1 ? ' comm-line-zebra' : '';
      return `<div class="comm-line${zebra}">
  <div class="comm-line-copy">
    <div class="comm-line-title">${escapeHtml(title)}</div>
    ${detail ? `<div class="comm-line-detail">${escapeHtml(detail)}</div>` : ''}
  </div>
  <div class="comm-line-amount">${pence === null ? '—' : escapeHtml(formatPence(pence))}</div>
</div>`;
    })
    .join('');
}

function totalsHtml(input: ReportHtmlInput, type: 'quote' | 'invoice'): string {
  const lines = linesForReport(input.pricing);
  const includeVat = Boolean(input.business.vatNumber?.trim());
  const breakdown = pricingVatBreakdown(lines, includeVat ? VAT_RATE_PERCENT : 0);
  if (!breakdown) return '';

  const rows: string[] = [];
  if (includeVat) {
    rows.push(
      `<div class="comm-total-row"><span>Subtotal</span><span>${escapeHtml(formatPence(breakdown.subtotalPence))}</span></div>`,
      `<div class="comm-total-row"><span>VAT ${VAT_RATE_PERCENT}%</span><span>${escapeHtml(formatPence(breakdown.vatPence))}</span></div>`
    );
  }

  const totalLabel = type === 'quote' ? 'Quote total' : 'Total due';
  rows.push(
    `<div class="comm-total-final"><span>${escapeHtml(totalLabel)}</span><span>${escapeHtml(
      formatPence(breakdown.totalPence)
    )}</span></div>`
  );

  return `<div class="comm-totals">${rows.join('')}</div>`;
}

/** Figma pay-by-card callout for the commercial invoice sheet. */
function commercialPayBlock(inv: ReportInvoiceDetails, totalPence: number | null): string {
  const link = inv.stripePaymentLink?.trim();
  const bankBits = [inv.sortCode, inv.accountNumber].filter((v) => v && String(v).trim()).join(' · ');
  if (!link && !bankBits) return '';

  const amountLabel = totalPence != null ? formatPence(totalPence) : null;
  const enterLine = amountLabel
    ? `Enter ${amountLabel} · reference ${inv.invoiceNumber}`
    : `Use reference ${inv.invoiceNumber}`;

  if (!link) {
    return `<div class="comm-pay comm-pay-bank-only">
      <p class="comm-pay-enter">${escapeHtml(enterLine)}</p>
      <p class="comm-pay-bank">Bank transfer: ${escapeHtml(bankBits)}</p>
    </div>`;
  }

  const display = displayReviewUrl(link);
  const qr = reviewQrDataUri(link, 66);
  const qrHtml = qr
    ? `<div class="comm-pay-qr"><img src="${qr}" alt="" width="66" height="66" /></div>`
    : '';

  return `<div class="comm-pay">
    <div class="comm-pay-copy">
      <a class="comm-pay-btn" href="${escapeHtml(link)}">Pay by card</a>
      <a class="comm-pay-link" href="${escapeHtml(link)}">${escapeHtml(display)}</a>
      <p class="comm-pay-enter">${escapeHtml(enterLine)}</p>
      ${bankBits ? `<p class="comm-pay-bank">Or bank transfer: ${escapeHtml(bankBits)}</p>` : ''}
    </div>
    ${qrHtml}
  </div>`;
}

function metaRowsHtml(input: ReportHtmlInput, type: 'quote' | 'invoice'): string {
  const issued = formatDateShort(
    input.quote?.issuedAt ?? input.generatedAt ?? input.job.jobDate
  );
  const rows: string[] = [
    `<div class="comm-meta-row"><span>Issue date</span><span>${escapeHtml(issued)}</span></div>`,
  ];
  if (type === 'quote') {
    const valid = input.quote?.validUntil ? formatDateShort(input.quote.validUntil) : '—';
    rows.push(
      `<div class="comm-meta-row"><span>Valid until</span><span>${escapeHtml(valid)}</span></div>`,
      `<div class="comm-meta-note">All amounts in GBP</div>`
    );
  } else {
    const due = input.invoice?.dueDate ? formatDateShort(input.invoice.dueDate) : '—';
    rows.push(`<div class="comm-meta-row"><span>Due date</span><span>${escapeHtml(due)}</span></div>`);
    const quoteRef = input.quote?.quoteNumber?.trim();
    if (quoteRef) {
      rows.push(
        `<div class="comm-meta-row"><span>Quote ref.</span><span>${escapeHtml(quoteRef)}</span></div>`
      );
    }
  }
  return rows.join('');
}

function termsHtml(input: ReportHtmlInput, type: 'quote' | 'invoice', number: string): string {
  const email = input.business.email?.trim() || 'us';
  if (type === 'quote') {
    const scope =
      input.business.footerMessage?.trim() ||
      input.job.description?.trim() ||
      'Scope, exclusions and quote terms as discussed.';
    const validNote = input.quote?.validUntil
      ? `Valid until ${formatDate(input.quote.validUntil)}.`
      : '';
    return `<div class="comm-terms">
  <div class="comm-terms-col">
    <p class="comm-terms-label">SCOPE &amp; TERMS</p>
    <p class="comm-terms-body">${escapeHtml(scope)}</p>
  </div>
  <div class="comm-terms-col">
    <p class="comm-terms-label">HOW TO ACCEPT</p>
    <p class="comm-terms-body">To accept this quote, contact ${escapeHtml(email)}.
Please reference ${escapeHtml(number || 'this quote')}.
${escapeHtml(validNote)}</p>
  </div>
</div>`;
  }

  const inv = input.invoice;
  const accountName = inv?.bankName?.trim() || input.business.name;
  const paymentLines = [
    `Account name: ${accountName}`,
    inv?.sortCode?.trim() ? `Sort code: ${inv.sortCode.trim()}` : null,
    inv?.accountNumber?.trim() ? `Account number: ${inv.accountNumber.trim()}` : null,
    number ? `Payment reference: ${number}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  const terms =
    inv?.paymentTerms?.trim() ||
    (inv?.dueDate ? `Please pay by ${formatDate(inv.dueDate)}.` : 'Payment due as stated.');
  const dueLine = inv?.dueDate ? `Please pay by ${formatDate(inv.dueDate)}.` : '';

  return `<div class="comm-terms">
  <div class="comm-terms-col">
    <p class="comm-terms-label">PAYMENT DETAILS</p>
    <p class="comm-terms-body">${escapeHtml(paymentLines || 'Bank details on request.')}</p>
  </div>
  <div class="comm-terms-col">
    <p class="comm-terms-label">PAYMENT TERMS</p>
    <p class="comm-terms-body">${escapeHtml(terms)}
${escapeHtml(dueLine)}
Questions? Contact ${escapeHtml(email)}.</p>
  </div>
</div>`;
}

function letterheadHtml(
  input: ReportHtmlInput,
  type: 'quote' | 'invoice',
  template: CommercialTemplateId,
  number: string
): string {
  const kindLabel = DOCUMENT_TYPE_LABELS[type].toUpperCase();
  const contact = contactLine(input);
  const vat = input.business.vatNumber?.trim();
  const logo =
    template !== 'minimal' && input.business.logoDataUri
      ? `<img class="comm-logo" src="${input.business.logoDataUri}" alt="" />`
      : '';

  return `<header class="comm-letterhead">
  <div class="comm-letterhead-accent"></div>
  <div class="comm-letterhead-inner">
    <div class="comm-biz">
      ${logo}
      <p class="comm-biz-name">${escapeHtml(input.business.name)}</p>
      ${input.business.address?.trim() ? `<p class="comm-biz-line">${escapeHtml(input.business.address.trim())}</p>` : ''}
      ${contact ? `<p class="comm-biz-line">${escapeHtml(contact)}</p>` : ''}
      ${vat ? `<p class="comm-biz-line">VAT no. ${escapeHtml(vat)}</p>` : ''}
    </div>
    <div class="comm-kind-block">
      <p class="comm-kind">${escapeHtml(kindLabel)}</p>
      ${number ? `<p class="comm-number">${escapeHtml(number)}</p>` : ''}
    </div>
  </div>
  <div class="comm-letterhead-rule"></div>
</header>`;
}

function commercialStyles(accent: string, template: CommercialTemplateId): string {
  const soft = softAccent(accent);
  return `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  color: ${INK};
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.comm-sheet {
  width: 210mm;
  min-height: 297mm;
  padding: 0 0 14mm;
  margin: 0 auto;
  position: relative;
}
.comm-letterhead { position: relative; padding: 0 40px; min-height: 146px; }
.comm-letterhead-accent { display: none; }
.comm-letterhead-rule { height: 1px; background: ${LINE_SOFT}; margin-top: 12px; }
.comm-letterhead-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-top: 35px;
}
.comm-biz { flex: 1; min-width: 0; }
.comm-logo {
  display: block;
  max-height: 28px;
  max-width: 120px;
  width: auto;
  height: auto;
  margin-bottom: 8px;
  object-fit: contain;
}
.comm-biz-name {
  margin: 0;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.4;
  color: ${INK};
}
.comm-biz-line {
  margin: 2px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: ${MUTED};
  white-space: pre-wrap;
}
.comm-kind-block { text-align: right; flex-shrink: 0; }
.comm-kind {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.4;
  color: ${accent};
  letter-spacing: 0.02em;
}
.comm-number {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: ${INK};
}
.comm-party {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 40px 0;
}
.comm-party-label {
  margin: 0;
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: ${accent};
  text-transform: uppercase;
}
.comm-party-name {
  margin: 6px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: ${INK};
}
.comm-party-addr {
  margin: 4px 0 0;
  font-size: 10px;
  line-height: 1.4;
  color: ${MUTED};
  white-space: pre-wrap;
}
.comm-meta { width: 200px; flex-shrink: 0; }
.comm-meta-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 9px;
  margin: 0 0 6px;
}
.comm-meta-row span:first-child { color: ${MUTED}; }
.comm-meta-row span:last-child { color: ${INK}; font-weight: 500; text-align: right; }
.comm-meta-note {
  margin: 8px 0 0;
  font-size: 9px;
  color: ${MUTED};
  text-align: right;
}
.comm-items { padding: 28px 40px 0; }
.comm-job-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: ${INK};
}
.comm-table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: ${soft};
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: ${MUTED};
  text-transform: uppercase;
}
.comm-table-head span:last-child { text-align: right; }
.comm-line {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border-bottom: 1px solid ${LINE};
}
.comm-line-copy { flex: 1; min-width: 0; }
.comm-line-title {
  font-size: 10.5px;
  font-weight: 500;
  color: ${INK};
}
.comm-line-detail {
  margin-top: 2px;
  font-size: 9px;
  color: ${MUTED};
}
.comm-line-amount {
  font-size: 11px;
  font-weight: 500;
  color: ${INK};
  white-space: nowrap;
  text-align: right;
}
.comm-empty {
  padding: 16px 14px;
  font-size: 10px;
  color: ${MUTED};
}
.comm-totals {
  margin: 20px 40px 0 auto;
  width: 215px;
}
.comm-total-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 10px;
  color: ${MUTED};
  margin: 0 0 8px;
}
.comm-total-row span:last-child { color: ${INK}; font-weight: 500; }
.comm-total-final {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 2px solid ${accent};
  font-size: 11px;
  font-weight: 600;
  color: ${INK};
}
.comm-total-final span:last-child { font-size: 18px; }
.comm-terms {
  display: flex;
  gap: 24px;
  padding: 28px 40px 0;
}
.comm-terms-col { flex: 1; min-width: 0; }
.comm-terms-label {
  margin: 0;
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: ${accent};
  text-transform: uppercase;
}
.comm-terms-body {
  margin: 8px 0 0;
  font-size: 9px;
  line-height: 1.45;
  color: ${MUTED};
  white-space: pre-wrap;
}
.comm-pay {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 16px 40px 0;
  padding: 12px;
  border-radius: 8px;
  background: ${soft};
  border: 1px solid color-mix(in srgb, ${accent} 28%, #ffffff);
  break-inside: avoid;
  page-break-inside: avoid;
}
.comm-pay-bank-only {
  margin: 16px 40px 0;
  padding: 12px;
  border-radius: 8px;
  background: #F2F4F2;
  border: 1px solid ${LINE};
}
.comm-pay-copy { flex: 1; min-width: 0; }
.comm-pay-btn {
  display: inline-block;
  background: ${STRIPE_PURPLE};
  color: #fff !important;
  text-decoration: none;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 6px;
  margin-bottom: 6px;
}
.comm-pay-link {
  display: block;
  color: ${STRIPE_PURPLE};
  font-size: 9px;
  text-decoration: none;
  margin: 4px 0;
  word-break: break-all;
}
.comm-pay-enter {
  margin: 6px 0 0;
  font-size: 9.5px;
  font-weight: 700;
  color: ${INK};
}
.comm-pay-bank {
  margin: 4px 0 0;
  font-size: 9px;
  color: ${MUTED};
}
.comm-pay-qr {
  flex-shrink: 0;
  width: 66px;
  height: 66px;
  background: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}
.comm-pay-qr img { width: 100%; height: 100%; display: block; }
.comm-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 24px 40px 0;
  padding-top: 12px;
  border-top: 1px solid ${LINE};
  font-size: 8px;
  color: ${MUTED};
}
.comm-footer-page { text-align: right; flex-shrink: 0; }

/* —— Classic —— */
body[data-template="commercial-classic"] .comm-letterhead-accent {
  display: block;
  position: absolute;
  left: 0; top: 0; right: 0;
  height: 6px;
  background: ${accent};
}

/* —— Bold —— */
body[data-template="commercial-bold"] .comm-letterhead {
  background: ${HEADER_DARK};
  min-height: 146px;
  padding-bottom: 6px;
}
body[data-template="commercial-bold"] .comm-letterhead-accent {
  display: block;
  position: absolute;
  left: 0; bottom: 0; right: 0;
  height: 6px;
  background: ${accent};
}
body[data-template="commercial-bold"] .comm-letterhead-rule { display: none; }
body[data-template="commercial-bold"] .comm-biz-name,
body[data-template="commercial-bold"] .comm-kind,
body[data-template="commercial-bold"] .comm-number { color: #fff; }
body[data-template="commercial-bold"] .comm-biz-line { color: ${HEADER_MUTED}; }
body[data-template="commercial-bold"] .comm-table-head {
  background: ${HEADER_DARK};
  color: #fff;
}
body[data-template="commercial-bold"] .comm-line-zebra { background: ${ZEBRA}; }
body[data-template="commercial-bold"] .comm-total-final {
  border-top: none;
  margin-top: 8px;
  padding: 12px 14px;
  background: ${accent};
  color: #fff;
  border-radius: 2px;
}
body[data-template="commercial-bold"] .comm-total-final span:last-child { color: #fff; }

/* —— Minimal —— */
body[data-template="commercial-minimal"] .comm-letterhead-accent { display: none; }
body[data-template="commercial-minimal"] .comm-biz-name { font-size: 18px; }
body[data-template="commercial-minimal"] .comm-kind {
  color: ${INK};
  font-weight: 400;
  font-size: 30px;
}
body[data-template="commercial-minimal"] .comm-letterhead-rule { background: ${INK}; }
body[data-template="commercial-minimal"] .comm-party-label,
body[data-template="commercial-minimal"] .comm-terms-label { color: ${MUTED}; }
body[data-template="commercial-minimal"] .comm-table-head {
  background: transparent;
  padding: 0 0 8px;
  border-bottom: 1px solid ${INK};
  color: ${MUTED};
}
body[data-template="commercial-minimal"] .comm-line {
  padding-left: 0;
  padding-right: 0;
  border-bottom: none;
}
body[data-template="commercial-minimal"] .comm-totals { width: auto; max-width: none; margin-left: 40px; margin-right: 40px; }
body[data-template="commercial-minimal"] .comm-total-final {
  border-top: 1px solid ${INK};
  width: 100%;
}
body[data-template="commercial-minimal"] .comm-total-final span:last-child { font-size: 20px; }
`;
}

/** Builds the Figma-aligned quote or invoice PDF (Classic / Bold / Minimal). */
export function buildCommercialDocumentHtml(input: ReportHtmlInput): string {
  const type = normalizeDocumentType(input.documentType);
  const commercialType: 'quote' | 'invoice' = type === 'invoice' ? 'invoice' : 'quote';
  const template = normalizeCommercialTemplateId(input.commercialTemplate);
  const accent = resolveAccent(input);
  const number = documentNumber(input, commercialType);
  const lines = linesForReport(input.pricing);
  const includeVat = Boolean(input.business.vatNumber?.trim());
  const breakdown = pricingVatBreakdown(lines, includeVat ? VAT_RATE_PERCENT : 0);

  const pay =
    commercialType === 'invoice' && input.invoice
      ? commercialPayBlock(input.invoice, breakdown?.totalPence ?? null)
      : '';

  const customerName = input.job.customerName?.trim() || '—';
  const customerAddr = input.job.address?.trim() || '';
  const partyLabel = commercialType === 'invoice' ? 'BILL TO' : 'PREPARED FOR';
  const footerBits = [input.business.name, input.business.registrationNumber?.trim()]
    .filter(Boolean)
    .join('  ·  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
${commercialStyles(accent, template)}
</style>
</head>
<body data-template="commercial-${template}" data-doc="${commercialType}" data-tier="commercial">
<article class="comm-sheet">
  ${letterheadHtml(input, commercialType, template, number)}
  <section class="comm-party">
    <div class="comm-party-left">
      <p class="comm-party-label">${partyLabel}</p>
      <p class="comm-party-name">${escapeHtml(customerName)}</p>
      ${customerAddr ? `<p class="comm-party-addr">${escapeHtml(customerAddr)}</p>` : ''}
    </div>
    <div class="comm-meta">${metaRowsHtml(input, commercialType)}</div>
  </section>
  <section class="comm-items">
    <p class="comm-job-title">${escapeHtml(input.job.title || 'Work')}</p>
    <div class="comm-table-head"><span>DESCRIPTION</span><span>AMOUNT</span></div>
    ${lineRowsHtml(input, template)}
  </section>
  ${totalsHtml(input, commercialType)}
  ${pay}
  ${termsHtml(input, commercialType, number)}
  <footer class="comm-footer">
    <span>${escapeHtml(footerBits)}</span>
    <span class="comm-footer-page">1 / 1</span>
  </footer>
</article>
</body>
</html>`;
}
