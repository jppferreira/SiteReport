import {
  annotationsToSvgMarkup,
  displayReviewUrl,
  DOCUMENT_TYPE_LABELS,
  formatPence,
  groupPricingLines,
  hasAnnotations,
  linesForReport,
  parseAmountToPence,
  PRICING_CATEGORIES,
  PRICING_CATEGORY_LABELS,
  pricingVatBreakdown,
  REVIEW_PROVIDER_LABELS,
  VAT_RATE_PERCENT,
} from '@/models';
import { formatDate, formatDateTime } from '@/utils/format';

import { DEFAULT_COVER_SCENE } from '../defaultScenes';
import { invoicePayByCardBlock } from '../invoicePayByCard';
import { reviewQrDataUri } from '../qrSvg';
import { ReportHtmlInput, ReportPhotoData, ReportPhotoGroup } from '../types';

import { SVG_STARS, SVG_TICK } from './assets';

const FALLBACK_ACCENT = '#1FA84A';

type Rgb = { r: number; g: number; b: number };

export type PremiumTheme = {
  accent: string;
  onAccent: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Tap target in the in-app preview — opens the text edit tray. */
export function editTextAttrs(field: string): string {
  return `data-preview-edit="text" data-edit-field="${escapeHtml(field)}"`;
}

function parseHex(value: string): Rgb | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match?.[1]) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Print CSS uses rgb() so a `#` never appears in a colour. */
export function cssColor(value: string): string {
  const trimmed = value.trim();
  if (/^rgba?\(/i.test(trimmed)) return trimmed;
  const rgb = parseHex(trimmed);
  if (!rgb) return 'rgb(31, 168, 74)';
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function premiumTheme(accentColor: string | undefined): PremiumTheme {
  const hex = parseHex(accentColor ?? '') ? accentColor! : FALLBACK_ACCENT;
  const rgb = parseHex(hex) ?? parseHex(FALLBACK_ACCENT)!;
  const light = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return {
    accent: cssColor(hex),
    onAccent: light >= 0.55 ? 'rgb(255, 255, 255)' : 'rgb(20, 24, 22)',
  };
}

export function isNonEmpty(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

export function rich(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

export function refLine(input: ReportHtmlInput): string {
  return isNonEmpty(input.job.referenceNumber) ? input.job.referenceNumber.trim() : '';
}

export function preparedBy(input: ReportHtmlInput): string {
  if (isNonEmpty(input.business.ownerName)) return input.business.ownerName.trim();
  return input.business.name;
}

export function businessInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function coverPhotoUri(input: ReportHtmlInput): string {
  if (isNonEmpty(input.coverDataUri)) return input.coverDataUri;
  if (isNonEmpty(input.brandCoverDataUri)) return input.brandCoverDataUri;
  const first = [...input.after, ...input.before, ...input.during].find((p) => isNonEmpty(p.dataUri));
  if (first?.dataUri) return first.dataUri;
  return DEFAULT_COVER_SCENE;
}

export function listItems(value: string | null): string[] | null {
  if (!isNonEmpty(value)) return null;
  const trimmed = value.trim();
  if (trimmed.includes('\n')) {
    const lines = trimmed
      .split(/\n/)
      .map((line) => line.replace(/^[\s•\-*·]+/, '').replace(/[;,\s]+$/, '').trim())
      .filter((line) => line.length > 0);
    return lines.length > 0 ? lines : null;
  }
  if (trimmed.includes(',') && !trimmed.includes('.')) {
    const parts = trimmed
      .split(',')
      .map((part) => part.replace(/^[\s•\-*·]+/, '').trim())
      .filter((part) => part.length > 0);
    if (parts.length > 1) return parts;
  }
  return [trimmed];
}

function svgWithoutHash(markup: string): string {
  return markup.replace(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g, (hex) => {
    const digits = hex.slice(1);
    const full = digits.length === 3 ? digits.split('').map((d) => d + d).join('') : digits;
    return cssColor(`#${full}`);
  });
}

function premPhotoImg(photo: ReportPhotoData, alt: string, className = 'prem-photo'): string {
  const width = photo.width > 0 ? photo.width : 1600;
  const height = photo.height > 0 ? photo.height : 1200;
  if (!hasAnnotations(photo.annotations)) {
    return `<img class="${className}" src="${photo.dataUri}" width="${width}" height="${height}" alt="${escapeHtml(alt)}" data-preview-edit="photo" data-photo-id="${escapeHtml(photo.id)}" />`;
  }
  // Fill the template photo frame (same crop as unmarked shots) so annotated
  // images don't leave empty bands or blow past the Figma cell size.
  const baked = annotationsToSvgMarkup(photo.annotations, width, height, {
    preserveAspectRatio: 'xMidYMid slice',
    className: 'prem-photo-marks',
    imageHref: photo.dataUri,
    ariaLabel: alt || 'Annotated photo',
  });
  return svgWithoutHash(baked);
}

export function premShot(
  photo: ReportPhotoData,
  label: string,
  showTag = true
): string {
  const caption = photo.caption?.trim() || label;
  return `<figure class="prem-shot" data-preview-edit="photo" data-photo-id="${escapeHtml(photo.id)}">
    <div class="prem-shot-frame">
      ${premPhotoImg(photo, caption)}
      ${showTag ? `<span class="prem-tag">${escapeHtml(label)}</span>` : ''}
    </div>
    ${caption ? `<figcaption>${rich(caption)}</figcaption>` : ''}
  </figure>`;
}

function pairRow(before: ReportPhotoData[], after: ReportPhotoData[]): string {
  const count = Math.max(before.length, after.length);
  const rows: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const left = before[i] ? premShot(before[i]!, 'Before') : '<div class="prem-gap"></div>';
    const right = after[i] ? premShot(after[i]!, 'After') : '<div class="prem-gap"></div>';
    rows.push(`<div class="prem-pair">${left}${right}</div>`);
  }
  return rows.join('');
}

function photoGroups(input: ReportHtmlInput): ReportPhotoGroup[] {
  const areas = (input.areas ?? []).filter(
    (a) => a.before.length + a.during.length + a.after.length > 0
  );
  if (areas.length > 0) return areas;
  if (input.before.length + input.during.length + input.after.length === 0) return [];
  return [
    {
      name: 'Site photos',
      before: input.before,
      during: input.during,
      after: input.after,
    },
  ];
}

function photoCountInput(input: ReportHtmlInput): number {
  return input.before.length + input.during.length + input.after.length;
}

export function premPhotosBlock(input: ReportHtmlInput, layout: 'pair' | 'stack' = 'pair'): string {
  const groups = photoGroups(input);
  if (groups.length === 0) return '';
  const count = photoCountInput(input);
  return groups
    .map((group) => {
      const duringShots = group.during.map((p) => premShot(p, 'During'));
      const inner =
        layout === 'stack'
          ? [
              ...group.before.map((p) => premShot(p, 'Before')),
              ...duringShots,
              ...group.after.map((p) => premShot(p, 'After')),
            ].join('')
          : `${pairRow(group.before, group.after)}${duringShots.join('')}`;
      const title = groups.length > 1 ? `<h3 class="prem-area-title">${escapeHtml(group.name)}</h3>` : '';
      return `<div class="prem-photos" data-photo-count="${count}">${title}${inner}</div>`;
    })
    .join('');
}

export function premLogo(input: ReportHtmlInput, theme: PremiumTheme): string {
  if (input.business.logoDataUri) {
    return `<img class="prem-logo" src="${input.business.logoDataUri}" alt="" />`;
  }
  const initial = escapeHtml(businessInitials(input.business.name));
  return `<div class="prem-logo prem-logo-fallback" style="background:${theme.accent};color:${theme.onAccent}">${initial}</div>`;
}

export function premChecklist(input: ReportHtmlInput, passLabel = 'Pass'): string {
  const items = input.checklist ?? [];
  if (items.length === 0) return '';
  const cards = items
    .map((item) => {
      const status = item.checked ? passLabel : '—';
      const tick = item.checked ? SVG_TICK : '';
      return `<div class="prem-reading"><span class="prem-reading-label">${escapeHtml(item.label)}</span><span class="prem-reading-value${item.checked ? ' is-pass' : ''}">${tick}${escapeHtml(status)}</span></div>`;
    })
    .join('');
  return `<div class="prem-readings">${cards}</div>`;
}

export function premMaterialsList(input: ReportHtmlInput): string {
  const items = listItems(input.materials);
  if (!items) return '';
  return `<ul class="prem-specs" ${editTextAttrs('materials')}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export function premWorkBullets(input: ReportHtmlInput): string {
  const items = listItems(input.workCompleted) ?? listItems(input.job.description);
  if (!items) return '';
  const field = isNonEmpty(input.workCompleted) ? 'work' : 'description';
  return `<ul class="prem-work" ${editTextAttrs(field)}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export function premAftercare(input: ReportHtmlInput): string {
  if (!isNonEmpty(input.recommendations)) return '';
  return `<div class="prem-care" ${editTextAttrs('recommendations')}><p>${rich(input.recommendations)}</p></div>`;
}

function normalizeDocumentType(input: ReportHtmlInput): 'invoice' | 'quote' | 'reference' {
  const raw = input.documentType;
  if (raw === 'invoice' || raw === 'quote') return raw;
  return 'reference';
}

export function premPricing(input: ReportHtmlInput, theme: PremiumTheme): string {
  const lines = linesForReport(input.pricing);
  if (lines.length === 0) return '';
  const type = normalizeDocumentType(input);
  const title = type === 'invoice' ? 'Invoice' : type === 'quote' ? 'Quote' : 'Pricing';
  const rows: string[] = [];
  for (const category of PRICING_CATEGORIES) {
    const group = groupPricingLines(lines)[category];
    if (!group?.length) continue;
    rows.push(`<tr class="prem-price-group"><td colspan="2">${escapeHtml(PRICING_CATEGORY_LABELS[category].toUpperCase())}</td></tr>`);
    for (const line of group) {
      const pence = parseAmountToPence(line.amount);
      rows.push(
        `<tr><td>${escapeHtml(line.description.trim() || '—')}</td><td class="num">${pence === null ? '—' : escapeHtml(formatPence(pence))}</td></tr>`
      );
    }
  }
  const includeVat = type !== 'reference' && Boolean(input.business.vatNumber?.trim());
  const breakdown = pricingVatBreakdown(lines, includeVat ? VAT_RATE_PERCENT : 0);
  let foot = '';
  if (breakdown) {
    if (includeVat) {
      foot = `<tfoot>
        <tr><td>Subtotal</td><td class="num">${escapeHtml(formatPence(breakdown.subtotalPence))}</td></tr>
        <tr><td>VAT ${VAT_RATE_PERCENT}%</td><td class="num">${escapeHtml(formatPence(breakdown.vatPence))}</td></tr>
        <tr class="prem-price-total"><td>Total</td><td class="num">${escapeHtml(formatPence(breakdown.totalPence))}</td></tr>
      </tfoot>`;
    } else {
      foot = `<tfoot><tr class="prem-price-total"><td>Total</td><td class="num">${escapeHtml(formatPence(breakdown.totalPence))}</td></tr></tfoot>`;
    }
  }
  const docBadge =
    type !== 'reference'
      ? `<span class="prem-doc-pill" style="background:${theme.accent};color:${theme.onAccent}">${escapeHtml(DOCUMENT_TYPE_LABELS[type].toUpperCase())}</span>`
      : '';
  const lede =
    type === 'reference'
      ? '<p class="lede">Figures for this job. This is not an invoice.</p>'
      : type === 'quote'
        ? '<p class="lede">Quoted figures for this job.</p>'
        : '<p class="lede">Amount due for the work in this report.</p>';
  return `<section class="block section-pricing" data-premium-pricing="1">
    <h2 class="block-title prem-section-title">${escapeHtml(title)} ${docBadge}</h2>
    ${lede}
    <table class="prem-price-table price-table"><thead><tr><th>Item</th><th class="num">Amount</th></tr></thead><tbody>${rows.join('')}</tbody>${foot}</table>
    ${type === 'invoice' && input.invoice ? invoicePayByCardBlock(input.invoice) : ''}
  </section>`;
}

export function premSignatureStrip(input: ReportHtmlInput): string {
  if (!input.signature) return '';
  const name = escapeHtml(input.signature.customerName || 'Customer');
  const when = formatDate(input.signature.signedAt);
  return `<div class="prem-sign section-signature" data-preview-edit="photo">
    <div class="prem-sign-pad">${svgWithoutHash(input.signature.svgMarkup)}</div>
    <div class="prem-sign-meta"><span>${name}</span><span>${when}</span></div>
  </div>`;
}

export function premReviewStrip(input: ReportHtmlInput, starColor: string): string {
  const review = input.review;
  if (!review?.url?.trim()) return '';
  const url = review.url.trim();
  const display = displayReviewUrl(url);
  const qr = reviewQrDataUri(url, 70);
  const providerLabel = REVIEW_PROVIDER_LABELS[review.provider] ?? 'Review';
  return `<div class="prem-review section-review">
    <div class="prem-review-copy">
      <p class="prem-review-title">Happy with our work?</p>
      <div class="prem-review-stars" style="color:${cssColor(starColor)}">${SVG_STARS}</div>
      <span class="prem-review-badge">${escapeHtml(providerLabel)}</span>
      <a class="prem-review-link" href="${escapeHtml(url)}">${escapeHtml(display)}</a>
    </div>
    ${qr ? `<div class="prem-review-qr"><img src="${qr}" alt="" width="70" height="70" /><span>Scan to review</span></div>` : ''}
  </div>`;
}

export function premMetaGrid(input: ReportHtmlInput): string {
  const rows = [
    isNonEmpty(input.job.customerName)
      ? `<div class="prem-meta-row"><dt>Customer</dt><dd>${escapeHtml(input.job.customerName.trim())}</dd></div>`
      : '',
    isNonEmpty(input.job.address) ? `<div class="prem-meta-row"><dt>Address</dt><dd>${rich(input.job.address)}</dd></div>` : '',
    `<div class="prem-meta-row"><dt>Date</dt><dd>${formatDate(input.job.jobDate)}</dd></div>`,
    refLine(input) ? `<div class="prem-meta-row"><dt>Reference</dt><dd>${escapeHtml(refLine(input))}</dd></div>` : '',
    `<div class="prem-meta-row"><dt>Engineer</dt><dd>${escapeHtml(preparedBy(input))}</dd></div>`,
  ].filter(Boolean);
  return `<dl class="prem-meta">${rows.join('')}</dl>`;
}

/** Atelier / paint swatches from materials or accent fallbacks. */
export function atelierSwatches(input: ReportHtmlInput, theme: PremiumTheme): string {
  const items = listItems(input.materials) ?? [];
  const demo = ['rgb(240, 236, 228)', 'rgb(216, 198, 178)', theme.accent, 'rgb(62, 74, 68)'];
  const labels = items.length >= 4 ? items.slice(0, 4) : [...items, 'Base coat', 'Mid tone', 'Accent', 'Trim'].slice(0, 4);
  return `<div class="prem-swatches">${labels
    .map((label, i) => {
      const color = demo[i] ?? theme.accent;
      return `<div class="prem-swatch"><span class="prem-swatch-chip" style="background:${color}"></span><span class="prem-swatch-label">${escapeHtml(label)}</span></div>`;
    })
    .join('')}</div>`;
}

export function premFooter(input: ReportHtmlInput): string {
  return `<p class="prem-foot">Generated ${formatDateTime(input.generatedAt)} · ${escapeHtml(input.business.name)}</p>`;
}

export function checklistAllPassed(input: ReportHtmlInput): boolean {
  const items = input.checklist ?? [];
  return items.length > 0 && items.every((item) => item.checked);
}

export function premSystemStatus(input: ReportHtmlInput): string {
  const items = input.checklist ?? [];
  if (items.length === 0) return 'Job in progress';
  return checklistAllPassed(input) ? 'All checks passed' : 'Job in progress';
}

export function descriptionExcerpt(input: ReportHtmlInput, maxLen = 180): string {
  const raw = input.job.description?.trim() ?? '';
  if (!raw) return '';
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen - 1).trim()}…`;
}

export function businessTagline(input: ReportHtmlInput, fallback: string): string {
  if (isNonEmpty(input.business.website)) {
    const site = input.business.website.trim();
    try {
      return new URL(site).hostname.replace(/^www\./i, '');
    } catch {
      return site;
    }
  }
  if (isNonEmpty(input.business.phone)) return input.business.phone.trim();
  return fallback;
}

export function premCoverDocTitle(input: ReportHtmlInput): string {
  if (input.documentType === 'invoice') return 'INVOICE & SERVICE RECORD';
  if (input.documentType === 'quote') return 'QUOTE & SCOPE REPORT';
  return 'SERVICE & COMPLETION REPORT';
}

export type MetaCol = { label: string; html: string };

export function premMetaCols(cols: MetaCol[]): string {
  const cells = cols
    .map(
      (col) =>
        `<div class="prem-meta-col"><span class="prem-meta-col-label">${escapeHtml(col.label)}</span><span class="prem-meta-col-value">${col.html}</span></div>`
    )
    .join('');
  return `<div class="prem-meta-cols">${cells}</div>`;
}

export function premSectionHead(num: string, title: string, className = ''): string {
  const extra = className ? ` ${className}` : '';
  return `<h2 class="prem-section-title${extra}"><span class="prem-sec-num">${escapeHtml(num)}</span> ${escapeHtml(title)}</h2>`;
}

export function premWorkSafetyCols(input: ReportHtmlInput): string {
  const work = premWorkBullets(input) || '<p class="prem-muted">No work items recorded.</p>';
  const safety = premChecklist(input) || '<p class="prem-muted">No safety checks recorded.</p>';
  return `<div class="prem-two-col"><div class="prem-col-block"><h3 class="prem-col-head">Work completed</h3>${work}</div><div class="prem-col-block"><h3 class="prem-col-head">Safety checks</h3>${safety}</div></div>`;
}

export function premCircuitPassTable(input: ReportHtmlInput): string {
  const items = input.checklist ?? [];
  if (items.length === 0) {
    return '<p class="prem-muted">No checklist items recorded.</p>';
  }
  const rows = items
    .map((item) => {
      const pill = item.checked
        ? '<span class="prem-pass-pill">PASS</span>'
        : '<span class="prem-pass-pill is-open">—</span>';
      return `<tr><td>${escapeHtml(item.label)}</td><td class="num">${pill}</td></tr>`;
    })
    .join('');
  return `<table class="prem-circuit-table"><thead><tr><th>Check</th><th class="num">Result</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function premPhotosNumbered(input: ReportHtmlInput, max?: number): string {
  const all = [...input.before, ...input.after, ...input.during];
  const photos = max === undefined ? all : all.slice(0, max);
  if (photos.length === 0) return '';
  return `<div class="prem-num-photos" data-photo-count="${photoCountInput(input)}">${photos
    .map(
      (photo, i) => `<figure class="prem-num-shot"><div class="prem-num-frame">${premPhotoImg(photo, photo.caption ?? `Photo ${i + 1}`)}<span class="prem-num-badge">${String(i + 1).padStart(2, '0')}</span></div>${photo.caption?.trim() ? `<figcaption>${rich(photo.caption.trim())}</figcaption>` : ''}</figure>`
    )
    .join('')}</div>`;
}

export function premScopeCards(input: ReportHtmlInput, max = 3): string {
  const fromMaterials = listItems(input.materials) ?? [];
  const fromWork = listItems(input.workCompleted) ?? [];
  const combined = [...fromWork, ...fromMaterials].filter(Boolean).slice(0, max);
  if (combined.length === 0) return '';
  return `<div class="prem-scope-cards">${combined
    .map(
      (text, i) =>
        `<div class="prem-scope-card"><span class="prem-scope-num">0${i + 1}</span><p>${escapeHtml(text)}</p></div>`
    )
    .join('')}</div>`;
}

export function premHandoverChecklist(input: ReportHtmlInput): string {
  const items = input.checklist ?? [];
  if (items.length === 0) return '';
  return `<div class="prem-handover-row">${items
    .map(
      (item) =>
        `<span class="prem-handover-chip${item.checked ? ' is-done' : ''}">${item.checked ? SVG_TICK : ''}${escapeHtml(item.label)}</span>`
    )
    .join('')}</div>`;
}

export function premGalleryGrid(input: ReportHtmlInput): string {
  const before = input.before[0];
  const after = input.after[0];
  const detail = input.after[1] ?? input.during[0] ?? input.before[1];
  const shots: { photo: ReportPhotoData; label: string }[] = [];
  if (before) shots.push({ photo: before, label: 'Before' });
  if (after) shots.push({ photo: after, label: 'After' });
  if (detail) shots.push({ photo: detail, label: 'Detail' });
  if (shots.length === 0) return premPhotosBlock(input);
  if (photoCountInput(input) > shots.length) return premPhotosBlock(input);
  return `<div class="prem-gallery-3" data-photo-count="${photoCountInput(input)}">${shots
    .map(
      (s) =>
        `<figure class="prem-gallery-cell"><div class="prem-shot-frame">${premPhotoImg(s.photo, s.label)}<span class="prem-tag">${escapeHtml(s.label)}</span></div></figure>`
    )
    .join('')}</div>`;
}

export function premDarkSignoff(input: ReportHtmlInput, starColor: string): string {
  const sign = premSignatureStrip(input);
  const review = premReviewStrip(input, starColor);
  if (!sign && !review) return '';
  return `<div class="prem-signoff-dark">${sign}${review}</div>`;
}