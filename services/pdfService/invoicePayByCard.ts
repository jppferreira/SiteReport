import { displayReviewUrl } from '@/models';

import { reviewQrDataUri } from './qrSvg';
import { ReportInvoiceDetails } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Card-payment callout with QR when a Stripe Payment Link is set on the invoice. */
export function invoicePayByCardBlock(inv: ReportInvoiceDetails): string {
  const link = inv.stripePaymentLink?.trim();
  if (!link) return '';
  const display = displayReviewUrl(link);
  const qr = reviewQrDataUri(link, 70);
  const qrHtml = qr
    ? `<div class="invoice-pay-qr"><img src="${qr}" alt="" width="70" height="70" /><span class="invoice-pay-ref">Use ${escapeHtml(
        inv.invoiceNumber
      )} as payment reference</span></div>`
    : '';
  return `<div class="invoice-pay-card">
    <div class="invoice-pay-copy">
      <p class="invoice-pay-title">Pay by card</p>
      <p class="invoice-pay-lede">Enter the amount due and use your invoice number as the payment reference.</p>
      <a class="invoice-pay-link" href="${escapeHtml(link)}">${escapeHtml(display)}</a>
    </div>
    ${qrHtml}
  </div>`;
}