import { displayReviewUrl, formatPence } from '@/models';

import { reviewQrDataUri } from './qrSvg';
import { ReportInvoiceDetails } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type PayByCardOptions = {
  /** Total amount for “Enter £X · reference INV-…” (Figma L7). */
  totalPence?: number | null;
};

/**
 * Card-payment callout with QR when a Stripe Payment Link is set.
 * Layout matches Figma Documents L7: Pay by card button, link, amount · reference, bank alternative, QR.
 */
export function invoicePayByCardBlock(inv: ReportInvoiceDetails, opts?: PayByCardOptions): string {
  const link = inv.stripePaymentLink?.trim();
  const bankBits = [inv.sortCode, inv.accountNumber].filter((v) => v && String(v).trim()).join(' · ');
  if (!link && !bankBits) return '';

  const amountLabel = opts?.totalPence != null ? formatPence(opts.totalPence) : null;
  const enterLine = amountLabel
    ? `Enter ${amountLabel} · reference ${inv.invoiceNumber}`
    : `Use ${inv.invoiceNumber} as payment reference`;

  if (!link) {
    return `<div class="invoice-pay-card invoice-pay-card-bank">
      <div class="invoice-pay-copy">
        <p class="invoice-pay-enter">${escapeHtml(enterLine)}</p>
        <p class="invoice-pay-bank">Bank transfer: ${escapeHtml(bankBits)}</p>
      </div>
    </div>`;
  }

  const display = displayReviewUrl(link);
  const qr = reviewQrDataUri(link, 70);
  const qrHtml = qr
    ? `<div class="invoice-pay-qr"><img src="${qr}" alt="" width="70" height="70" /></div>`
    : '';

  return `<div class="invoice-pay-card">
    <div class="invoice-pay-copy">
      <a class="invoice-pay-btn" href="${escapeHtml(link)}">Pay by card</a>
      <a class="invoice-pay-link" href="${escapeHtml(link)}">${escapeHtml(display)}</a>
      <p class="invoice-pay-enter">${escapeHtml(enterLine)}</p>
      ${bankBits ? `<p class="invoice-pay-bank">Or bank transfer: ${escapeHtml(bankBits)}</p>` : ''}
    </div>
    ${qrHtml}
  </div>`;
}
