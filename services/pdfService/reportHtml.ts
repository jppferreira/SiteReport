import { formatDate, formatDateTime } from '@/utils/format';

import { ReportHtmlInput, ReportPhotoData } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2p(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

function photoCard(photo: ReportPhotoData, label: string): string {
  const isLandscape = photo.width >= photo.height;
  const caption = photo.caption ? `<div class="photo-caption">${escapeHtml(photo.caption)}</div>` : '';
  return `
    <div class="photo-card">
      <div class="photo-frame ${isLandscape ? 'landscape' : 'portrait'}">
        <img src="${photo.dataUri}" alt="${label} photo" />
      </div>
      ${caption}
    </div>
  `;
}

function photoSection(title: string, photos: ReportPhotoData[]): string {
  if (photos.length === 0) return '';
  return `
    <section class="section">
      <h2 class="section-title">${title}</h2>
      <div class="photo-grid">
        ${photos.map((p) => photoCard(p, title)).join('\n')}
      </div>
    </section>
  `;
}

function textSection(title: string, body: string | null): string {
  if (!body || body.trim().length === 0) return '';
  return `
    <section class="section">
      <h2 class="section-title">${title}</h2>
      <div class="section-body">${nl2p(body)}</div>
    </section>
  `;
}

export function buildReportHtml(input: ReportHtmlInput): string {
  const accent = input.business.accentColor || '#34D058';
  const isNonEmpty = (value: string | null | undefined): value is string => Boolean(value && value.trim().length > 0);
  const contactLines = [input.business.phone, input.business.email, input.business.website]
    .filter(isNonEmpty)
    .map(escapeHtml)
    .join(' &nbsp;·&nbsp; ');

  const addressLine = input.business.address ? escapeHtml(input.business.address) : '';
  const regLine = [input.business.registrationNumber, input.business.vatNumber]
    .filter(isNonEmpty)
    .map(escapeHtml)
    .join(' &nbsp;·&nbsp; ');

  const customerBlock = input.job.customerName || input.job.address
    ? `
      <section class="section customer-block">
        <h2 class="section-title">Customer</h2>
        ${input.job.customerName ? `<p class="customer-name">${escapeHtml(input.job.customerName)}</p>` : ''}
        ${input.job.address ? `<p class="customer-address">${escapeHtml(input.job.address)}</p>` : ''}
      </section>
    `
    : '';

  const signatureBlock = input.signature
    ? `
      <section class="section signature-block">
        <h2 class="section-title">Customer sign-off</h2>
        <p class="signature-intro">This report and the work described above was reviewed and acknowledged by the customer.</p>
        <div class="signature-canvas">${input.signature.svgMarkup}</div>
        <div class="signature-meta">
          <div>
            <div class="signature-label">Signed by</div>
            <div class="signature-value">${escapeHtml(input.signature.customerName || 'Customer')}</div>
          </div>
          <div>
            <div class="signature-label">Date</div>
            <div class="signature-value">${formatDateTime(input.signature.signedAt)}</div>
          </div>
        </div>
      </section>
    `
    : '';

  const logoBlock = input.business.logoDataUri
    ? `<img class="logo" src="${input.business.logoDataUri}" alt="${escapeHtml(input.business.name)} logo" />`
    : `<div class="logo-placeholder" style="background:${accent}">${escapeHtml(
        (input.business.name || 'S').slice(0, 1).toUpperCase()
      )}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  @page {
    size: A4;
    margin: 22mm 18mm 26mm 18mm;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #101310;
    font-size: 11pt;
    line-height: 1.5;
    background: #FFFFFF;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 10mm;
    border-bottom: 1px solid #E6E9E6;
    margin-bottom: 8mm;
  }

  .brand-row { display: flex; align-items: center; gap: 4mm; }
  .logo { width: 16mm; height: 16mm; object-fit: contain; border-radius: 3mm; }
  .logo-placeholder {
    width: 16mm; height: 16mm; border-radius: 3mm; color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 16pt; font-weight: 700;
  }
  .business-name { font-size: 13pt; font-weight: 600; margin: 0; }
  .report-kicker {
    text-align: right; font-size: 8pt; letter-spacing: 1.2px; color: #66706A;
    text-transform: uppercase; font-weight: 600;
  }

  .title-row { margin-bottom: 10mm; }
  .job-title { font-size: 21pt; font-weight: 600; margin: 0 0 3mm 0; letter-spacing: -0.2px; }
  .meta-row { display: flex; gap: 8mm; font-size: 9.5pt; color: #66706A; }
  .meta-row strong { color: #101310; font-weight: 600; }

  .section { margin-bottom: 8mm; break-inside: avoid; page-break-inside: avoid; }
  .section-title {
    font-size: 9pt; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 600;
    color: ${accent}; margin: 0 0 3mm 0; padding-bottom: 2mm; border-bottom: 1px solid #E6E9E6;
  }
  .section-body p { margin: 0 0 3mm 0; }
  .customer-name { font-weight: 600; margin: 0 0 1mm 0; font-size: 11.5pt; }
  .customer-address { margin: 0; color: #66706A; }

  .photo-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4mm;
  }
  .photo-card {
    width: 47%;
    break-inside: avoid;
    page-break-inside: avoid;
    border: 1px solid #E6E9E6;
    border-radius: 3mm;
    overflow: hidden;
    background: #F7F8F7;
  }
  .photo-frame {
    width: 100%;
    aspect-ratio: 4 / 3;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #101310;
  }
  .photo-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .photo-frame.portrait img { object-fit: cover; }
  .photo-caption {
    padding: 2.5mm 3mm;
    font-size: 8.5pt;
    color: #66706A;
    border-top: 1px solid #E6E9E6;
  }

  .signature-canvas {
    border: 1px solid #E6E9E6;
    border-radius: 3mm;
    background: #FBFCFB;
    padding: 4mm;
    margin: 3mm 0;
  }
  .signature-canvas svg { width: 60mm; height: auto; display: block; }
  .signature-intro { color: #66706A; font-size: 9.5pt; margin: 0 0 3mm 0; }
  .signature-meta { display: flex; gap: 10mm; margin-top: 2mm; }
  .signature-label { font-size: 8pt; color: #66706A; text-transform: uppercase; letter-spacing: 0.6px; }
  .signature-value { font-size: 10pt; font-weight: 600; margin-top: 0.5mm; }

  .doc-footer {
    margin-top: 12mm;
    padding-top: 5mm;
    border-top: 1px solid #E6E9E6;
    font-size: 8.5pt;
    color: #66706A;
    text-align: center;
  }
  .doc-footer .footer-message { color: #101310; font-weight: 500; margin-bottom: 2mm; font-size: 10pt; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand-row">
      ${logoBlock}
      <p class="business-name">${escapeHtml(input.business.name)}</p>
    </div>
    <div class="report-kicker">Job Report</div>
  </div>

  <div class="title-row">
    <h1 class="job-title">${escapeHtml(input.job.title)}</h1>
    <div class="meta-row">
      ${input.job.referenceNumber ? `<div>Ref <strong>${escapeHtml(input.job.referenceNumber)}</strong></div>` : ''}
      <div>Date <strong>${formatDate(input.job.jobDate)}</strong></div>
    </div>
  </div>

  ${customerBlock}
  ${textSection('Job summary', input.job.description)}
  ${photoSection('Before', input.before)}
  ${textSection('Work completed', input.workCompleted)}
  ${photoSection('After', input.after)}
  ${textSection('Materials used', input.materials)}
  ${textSection('Recommendations', input.recommendations)}
  ${signatureBlock}

  <div class="doc-footer">
    ${input.business.footerMessage ? `<div class="footer-message">${escapeHtml(input.business.footerMessage)}</div>` : ''}
    ${contactLines ? `<div>${contactLines}</div>` : ''}
    ${addressLine ? `<div>${addressLine}</div>` : ''}
    ${regLine ? `<div>${regLine}</div>` : ''}
    <div style="margin-top:2mm;">Generated ${formatDateTime(input.generatedAt)} · Created with SiteReport</div>
  </div>
</body>
</html>`;
}
