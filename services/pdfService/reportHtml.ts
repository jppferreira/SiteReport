import {
  CoverDesignId,
  formatPence,
  imageMaskClipPath,
  ImageMaskEdge,
  isFreeReportTemplate,
  JobStatus,
  linesForReport,
  normalizeCoverDesignId,
  normalizeReportImageMask,
  normalizeReportTemplateId,
  parseAmountToPence,
  PRICING_CATEGORY_LABELS,
  pricingTotalPence,
  ReportImageMask,
  ReportTemplateId,
} from '@/models';
import { formatTakenAt } from '@/services/photoTakenAt';
import { formatDate, formatDateTime } from '@/utils/format';

import { DEFAULT_COVER_SCENE, DEFAULT_THANKS_SCENE } from './defaultScenes';
import { ReportHtmlInput, ReportPhotoData } from './types';

const FALLBACK_ACCENT = '#1FA84A';
const INK = '#141816';
const MUTED = '#5E675F';
const LINE = '#E4E7E4';
const WASH = '#F4F6F4';
const PAPER = '#FFFFFF';
const HERO = '#121614';

type Rgb = { r: number; g: number; b: number };

type Theme = {
  accent: string;
  onAccent: string;
  tint: string;
  /** Accent when it stays visible on the dark cover, otherwise white. */
  onCover: string;
};

const ICON_USER = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.2 19.2c1.3-3.1 3.7-4.6 6.8-4.6s5.5 1.5 6.8 4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ICON_CAL = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 3.5v4M16 3.5v4M4 10h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ICON_DOC = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3.8V9h5.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 12.2l2.4 2.4 5.2-5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_PHONE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5h2.2l1.2 3-1.6 1a12 12 0 0 0 5.7 5.7l1-1.6 3 1.2V16a2 2 0 0 1-2.2 2A14.5 14.5 0 0 1 6 7.7 2 2 0 0 1 8 4.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const ICON_MAIL = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const ICON_WEB = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 12h16M12 4c2.2 2.4 3.3 5.1 3.3 8s-1.1 5.6-3.3 8c-2.2-2.4-3.3-5.1-3.3-8s1.1-5.6 3.3-8z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Print CSS uses rgb() so a `#` never appears in a colour. */
function cssColor(value: string): string {
  const rgb = parseHex(value);
  if (!rgb) return 'rgb(31, 168, 74)';
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function svgWithoutHash(markup: string): string {
  return markup.replace(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g, (hex) => {
    const digits = hex.slice(1);
    const full = digits.length === 3 ? digits.split('').map((digit) => digit + digit).join('') : digits;
    return cssColor(`#${full}`);
  });
}

/**
 * Android's print WebView has treated `#` as the end of the document.
 * Encoding it as `%23` left colours as the literal text `%23`. A named
 * character still prints as `#` and does not cut the file off.
 */
export function prepareAndroidPrintHtml(html: string): string {
  return html.replace(/#/g, '&num;');
}

function nl2p(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

function rich(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br/>');
}

function parseHex(value: string): Rgb | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match?.[1]) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: Rgb): number {
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function mixWithWhite(rgb: Rgb, amount: number): string {
  const ch = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${ch(rgb.r)}, ${ch(rgb.g)}, ${ch(rgb.b)})`;
}

function buildTheme(accentColor: string): Theme {
  const rgb = parseHex(accentColor) ?? parseHex(FALLBACK_ACCENT)!;
  const light = luminance(rgb);
  const whiteContrast = 1.05 / (light + 0.05);
  const accent = cssColor(parseHex(accentColor) ? accentColor : FALLBACK_ACCENT);
  return {
    accent,
    onAccent: whiteContrast >= 3 ? 'rgb(255, 255, 255)' : cssColor(INK),
    tint: mixWithWhite(rgb, 0.9),
    onCover: light >= 0.15 ? accent : 'rgb(255, 255, 255)',
  };
}

function isNonEmpty(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

function displayWebsite(value: string): string {
  return value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function contactLines(input: ReportHtmlInput): string[] {
  const items = [input.business.phone, input.business.email];
  if (isNonEmpty(input.business.website)) items.push(displayWebsite(input.business.website));
  return items.filter(isNonEmpty);
}

function statusLabel(status: JobStatus): string {
  if (status === 'complete') return 'Completed';
  if (status === 'in_progress') return 'In progress';
  return 'Draft';
}

function statusPill(status: JobStatus): string {
  const done = status === 'complete';
  return `<span class="status ${done ? 'status-done' : 'status-open'}">${done ? '<span class="tick">✓</span>' : ''}${statusLabel(status)}</span>`;
}

function logoMark(input: ReportHtmlInput, theme: Theme): string {
  if (input.business.logoDataUri) {
    return `<img class="logo" src="${input.business.logoDataUri}" alt="" />`;
  }
  const initial = escapeHtml((input.business.name || 'S').slice(0, 1).toUpperCase());
  return `<div class="logo logo-fallback" style="background:${theme.accent};color:${theme.onAccent}">${initial}</div>`;
}

function brandLockup(input: ReportHtmlInput, theme: Theme): string {
  return `<div class="brand">${logoMark(input, theme)}<span class="brand-name">${escapeHtml(input.business.name)}</span></div>`;
}

function contactBlock(input: ReportHtmlInput, extraClass = ''): string {
  const lines = contactLines(input);
  if (lines.length === 0 && !isNonEmpty(input.business.address)) return '';
  const bits = [
    ...lines.map((line) => `<div>${escapeHtml(line)}</div>`),
    isNonEmpty(input.business.address) ? `<div>${rich(input.business.address)}</div>` : '',
  ];
  return `<div class="contact ${extraClass}">${bits.join('')}</div>`;
}

function listItems(value: string | null): string[] | null {
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

function proseSection(title: string, body: string | null, className: string): string {
  if (!isNonEmpty(body)) return '';
  return `<section class="block ${className}"><h2 class="block-title">${escapeHtml(title)}</h2><div class="prose">${nl2p(body)}</div></section>`;
}

function listSection(title: string, body: string | null, className: string): string {
  const items = listItems(body);
  if (!items) return '';
  const only = items[0];
  const inner =
    items.length === 1 && only
      ? `<div class="prose"><p>${escapeHtml(only)}</p></div>`
      : `<ul class="bullets">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  return `<section class="block ${className}"><h2 class="block-title">${escapeHtml(title)}</h2>${inner}</section>`;
}

function pricingSection(input: ReportHtmlInput): string {
  const lines = linesForReport(input.pricing);
  if (lines.length === 0) return '';
  const rows = lines
    .map((line) => {
      const pence = parseAmountToPence(line.amount);
      const label = line.description.trim() || '—';
      return `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(PRICING_CATEGORY_LABELS[line.category])}</td><td class="num">${
        pence === null ? '—' : escapeHtml(formatPence(pence))
      }</td></tr>`;
    })
    .join('');
  const total = pricingTotalPence(lines);
  const totalRow =
    total === null
      ? ''
      : `<tfoot><tr><td colspan="2">Total</td><td class="num">${escapeHtml(formatPence(total))}</td></tr></tfoot>`;
  return `<section class="block section-pricing"><h2 class="block-title">Pricing reference</h2><p class="lede">Figures for this job. This is not an invoice.</p><table class="price-table"><thead><tr><th>Item</th><th>Type</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody>${totalRow}</table></section>`;
}

function extraOverview(input: ReportHtmlInput): string {
  if (!isNonEmpty(input.workCompleted) || !isNonEmpty(input.job.description)) return '';
  if (input.job.description.trim() === input.workCompleted.trim()) return '';
  return proseSection('Overview', input.job.description, 'section-overview');
}

function cardRow(sections: string[]): string {
  const filled = sections.map((section) => section.trim()).filter((section) => section.length > 0);
  if (filled.length === 0) return '';
  return `<div class="card-row${filled.length === 1 ? ' single' : ''}">${filled.join('')}</div>`;
}

function photoCaption(photo: ReportPhotoData, fallback = ''): string {
  const caption = photo.caption?.trim() ?? '';
  const taken = formatTakenAt(photo.takenAt);
  const takenLabel = taken ? `Taken ${taken}` : '';
  if (caption && takenLabel) return `${caption} — ${takenLabel}`;
  return caption || takenLabel || fallback;
}

function shotFigure(photo: ReportPhotoData, label: 'Before' | 'After', showTag: boolean): string {
  const caption = photoCaption(photo);
  const section = label === 'Before' ? 'section-before' : 'section-after';
  const width = photo.width > 0 ? photo.width : 1600;
  const height = photo.height > 0 ? photo.height : 1200;
  return `<figure class="shot ${section}">
    <div class="shot-frame">
      <img src="${photo.dataUri}" width="${width}" height="${height}" alt="${escapeHtml(caption || `${label} photo`)}" />
      ${showTag ? `<span class="photo-tag">${label}</span>` : ''}
    </div>
    ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}
  </figure>`;
}

type PhotoPair = Pick<ReportHtmlInput, 'before' | 'after'>;

function photoCount(pair: PhotoPair): number {
  return pair.before.length + pair.after.length;
}

/** Prints one before/after set, or one set per named section when the job has them. */
function photosMarkup(input: ReportHtmlInput, render: (pair: PhotoPair) => string): string {
  const areas = (input.areas ?? []).filter((area) => area.before.length > 0 || area.after.length > 0);
  if (areas.length === 0) return render(input);
  return areas
    .map((area) => {
      const inner = render(area);
      if (!inner) return '';
      return `<section class="area-block"><h3 class="area-title">${escapeHtml(area.name)}</h3>${inner}</section>`;
    })
    .join('');
}

/** Before photos in one column, after photos in the other, so extra images stack instead of being dropped. */
function compareBlock(pair: PhotoPair, options: { tags: boolean; large?: boolean }): string {
  const { before, after } = pair;
  if (before.length === 0 && after.length === 0) return '';
  const count = ` data-photo-count="${photoCount(pair)}"`;
  const large = options.large ? ' large' : '';

  if (before.length === 0 || after.length === 0) {
    const photos = before.length > 0 ? before : after;
    const label = before.length > 0 ? 'Before' : 'After';
    const one = photos.length === 1 ? ' one' : '';
    return `<div class="shot-grid${one}${large}"${count}>${photos.map((photo) => shotFigure(photo, label, options.tags)).join('')}</div>`;
  }

  return `<div class="compare${large}"${count}>
    <div class="compare-col">${before.map((photo) => shotFigure(photo, 'Before', options.tags)).join('')}</div>
    <div class="compare-col">${after.map((photo) => shotFigure(photo, 'After', options.tags)).join('')}</div>
  </div>`;
}

function labeledCompare(pair: PhotoPair): string {
  const { before, after } = pair;
  if (before.length === 0 && after.length === 0) return '';
  const count = ` data-photo-count="${photoCount(pair)}"`;
  if (before.length === 0 || after.length === 0) {
    const photos = before.length > 0 ? before : after;
    const label = before.length > 0 ? 'Before' : 'After';
    return `<div class="compare"${count}><div class="compare-col"><h2 class="col-label">${label}</h2>${photos
      .map((photo) => shotFigure(photo, label, false))
      .join('')}</div></div>`;
  }
  return `<div class="compare large"${count}>
    <div class="compare-col"><h2 class="col-label">Before</h2>${before.map((photo) => shotFigure(photo, 'Before', false)).join('')}</div>
    <div class="compare-col"><h2 class="col-label">After</h2>${after.map((photo) => shotFigure(photo, 'After', false)).join('')}</div>
  </div>`;
}

function filmstrip(pair: PhotoPair): string {
  const items: { photo: ReportPhotoData; label: 'Before' | 'After' }[] = [
    ...pair.before.map((photo) => ({ photo, label: 'Before' as const })),
    ...pair.after.map((photo) => ({ photo, label: 'After' as const })),
  ];
  if (items.length === 0) return '';
  const size = items.length <= 1 ? ' one' : items.length === 2 ? ' few' : items.length === 3 ? ' three' : '';
  return `<div class="filmstrip${size}" data-photo-count="${items.length}">${items
    .map((item) => shotFigure(item.photo, item.label, true))
    .join('')}</div>`;
}

function signatureBlock(input: ReportHtmlInput, variant: 'block' | 'inline'): string {
  if (!input.signature) return '';
  const name = escapeHtml(input.signature.customerName || 'Customer');
  const when = formatDate(input.signature.signedAt);
  if (variant === 'inline') {
    return `<div class="sign-inline section-signature">
      <div class="sign-pad">${svgWithoutHash(input.signature.svgMarkup)}</div>
      <div class="sign-name">${name}</div>
      <div class="sign-when">${when}</div>
    </div>`;
  }
  return `<section class="signoff section-signature">
    <h2 class="block-title">Customer sign-off</h2>
    <p class="lede">I confirm the work in this report has been completed.</p>
    <div class="sign-pad">${svgWithoutHash(input.signature.svgMarkup)}</div>
    <div class="sign-meta">
      <div><div class="eyebrow">Signed by</div><div class="sign-name">${name}</div></div>
      <div><div class="eyebrow">Date</div><div class="sign-name">${when}</div></div>
    </div>
  </section>`;
}

function footerBlock(input: ReportHtmlInput): string {
  const message = isNonEmpty(input.business.footerMessage) ? `<p class="footer-message">${escapeHtml(input.business.footerMessage)}</p>` : '';
  const registration = [input.business.registrationNumber, input.business.vatNumber].filter(isNonEmpty).map(escapeHtml).join(' · ');
  return `<footer class="doc-footer">
    ${message}
    ${registration ? `<p>${registration}</p>` : ''}
    <p class="footer-meta">Generated ${formatDateTime(input.generatedAt)} · Created with Trade Report</p>
  </footer>`;
}

function refLine(input: ReportHtmlInput): string {
  return isNonEmpty(input.job.referenceNumber) ? input.job.referenceNumber.trim() : '';
}

function customerBlock(input: ReportHtmlInput): string {
  if (!isNonEmpty(input.job.customerName) && !isNonEmpty(input.job.address)) return '';
  return `<div class="section-customer">
    ${isNonEmpty(input.job.customerName) ? `<p class="person">${escapeHtml(input.job.customerName)}</p>` : ''}
    ${isNonEmpty(input.job.address) ? `<p class="addr">${rich(input.job.address)}</p>` : ''}
  </div>`;
}

const COVER_TAGLINE = 'Quality work. Documented.';

function preparedBy(input: ReportHtmlInput): string {
  if (isNonEmpty(input.business.ownerName)) return input.business.ownerName.trim();
  return input.business.name;
}

/** A job cover photo, then the branding cover, then the built-in interior. */
function coverPhotoUri(input: ReportHtmlInput): string {
  if (isNonEmpty(input.coverDataUri)) return input.coverDataUri;
  if (isNonEmpty(input.brandCoverDataUri)) return input.brandCoverDataUri;
  return DEFAULT_COVER_SCENE;
}

/** Branding thank-you photo, then the job cover, then the built-in closing interior. */
function thanksPhotoUri(input: ReportHtmlInput): string {
  if (isNonEmpty(input.brandThanksDataUri)) return input.brandThanksDataUri;
  if (isNonEmpty(input.coverDataUri)) return input.coverDataUri;
  return DEFAULT_THANKS_SCENE;
}

function reportImageMask(input: ReportHtmlInput): ReportImageMask {
  return normalizeReportImageMask(input.imageMask);
}

function clipAttribute(mask: ReportImageMask, edge: ImageMaskEdge): string {
  const clip = imageMaskClipPath(mask, edge);
  return clip ? ` style="clip-path:${clip}"` : '';
}

function coverBadge(icon: string, label: string, value: string): string {
  return `<li class="cover-badge"><span class="cover-ico">${icon}</span><span class="cover-badge-label">${escapeHtml(label)}</span><span class="cover-badge-value">${escapeHtml(value)}</span></li>`;
}

function coverLockup(input: ReportHtmlInput, theme: Theme): string {
  return `<div class="cover-lockup">
      ${logoMark(input, theme)}
      <div class="cover-name">${escapeHtml(input.business.name)}</div>
      <p class="cover-tag">${COVER_TAGLINE}</p>
    </div>`;
}

function coverFacts(input: ReportHtmlInput): string {
  return [
    factRow('Project', escapeHtml(input.job.title)),
    isNonEmpty(input.job.address) ? factRow('Project address', rich(input.job.address)) : '',
    factRow('Report date', formatDate(input.job.jobDate)),
    factRow('Prepared by', escapeHtml(preparedBy(input))),
  ]
    .filter((row) => row.length > 0)
    .join('');
}

function coverBadgeList(input: ReportHtmlInput, className = 'cover-badges'): string {
  const reference = refLine(input);
  return `<ul class="${className}">
      ${coverBadge(ICON_USER, 'Customer', isNonEmpty(input.job.customerName) ? input.job.customerName.trim() : 'Not added')}
      ${coverBadge(ICON_DOC, 'Reference', reference || 'Not added')}
      ${coverBadge(ICON_CHECK, 'Status', statusLabel(input.job.status))}
    </ul>`;
}

function coverPhotoTag(input: ReportHtmlInput, className = 'cover-photo'): string {
  return `<img class="${className}" src="${coverPhotoUri(input)}" alt="" />`;
}

function coverSection(design: CoverDesignId, body: string): string {
  return `<section class="sheet-cover" data-cover="${design}">${body}</section>`;
}

function renderEditorialCover(input: ReportHtmlInput, theme: Theme): string {
  const clip = clipAttribute(reportImageMask(input), 'band');
  return coverSection(
    'editorial',
    `
    ${coverLockup(input, theme)}
    <h1 class="cover-title">Trade report</h1>
    <div class="cover-rule"></div>
    <dl class="cover-meta">${coverFacts(input)}</dl>
    <div class="cover-hero"${clip}>${coverPhotoTag(input)}</div>
    ${coverBadgeList(input)}
  `
  );
}

function renderBleedCover(input: ReportHtmlInput, theme: Theme): string {
  return coverSection(
    'bleed',
    `
    ${coverPhotoTag(input)}
    <div class="bleed-shade"></div>
    <div class="bleed-top">
      ${coverLockup(input, theme)}
    </div>
    <div class="bleed-bottom">
      <h1 class="cover-title">Trade report</h1>
      <div class="cover-rule"></div>
      <dl class="cover-meta">${coverFacts(input)}</dl>
      ${coverBadgeList(input)}
    </div>
  `
  );
}

function renderSplitCover(input: ReportHtmlInput, theme: Theme): string {
  const clip = clipAttribute(reportImageMask(input), 'side');
  return coverSection(
    'split',
    `
    <div class="split-copy">
      ${coverLockup(input, theme)}
      <h1 class="cover-title">Trade report</h1>
      <div class="cover-rule"></div>
      <dl class="cover-meta">${coverFacts(input)}</dl>
      ${coverBadgeList(input, 'cover-badges split-badges')}
    </div>
    <div class="split-photo"${clip}>${coverPhotoTag(input)}</div>
  `
  );
}

function renderPosterCover(input: ReportHtmlInput, theme: Theme): string {
  const clip = clipAttribute(reportImageMask(input), 'panel');
  return coverSection(
    'poster',
    `
    <div class="poster-head">
      ${coverLockup(input, theme)}
      <h1 class="poster-title">Trade<br />report</h1>
      <div class="cover-rule"></div>
    </div>
    <div class="poster-photo"${clip}>${coverPhotoTag(input)}</div>
    <dl class="cover-meta poster-meta">${coverFacts(input)}</dl>
    ${coverBadgeList(input)}
  `
  );
}

function renderCover(input: ReportHtmlInput, theme: Theme): string {
  const design = normalizeCoverDesignId(input.coverDesign);
  if (design === 'bleed') return renderBleedCover(input, theme);
  if (design === 'split') return renderSplitCover(input, theme);
  if (design === 'poster') return renderPosterCover(input, theme);
  return renderEditorialCover(input, theme);
}

function closeContact(icon: string, label: string, value: string): string {
  return `<li class="close-contact"><span class="cover-ico">${icon}</span><span class="cover-badge-label">${escapeHtml(label)}</span><span class="cover-badge-value">${escapeHtml(value)}</span></li>`;
}

function renderClose(input: ReportHtmlInput, theme: Theme): string {
  const message = isNonEmpty(input.business.footerMessage)
    ? input.business.footerMessage.trim()
    : 'We appreciate the opportunity to work on your property. If you have any questions, please get in touch.';
  const contacts = [
    isNonEmpty(input.business.phone) ? closeContact(ICON_PHONE, 'Call us', input.business.phone.trim()) : '',
    isNonEmpty(input.business.email) ? closeContact(ICON_MAIL, 'Email us', input.business.email.trim()) : '',
    isNonEmpty(input.business.website) ? closeContact(ICON_WEB, 'Visit us', displayWebsite(input.business.website)) : '',
  ].filter((item) => item.length > 0);
  const registration = [input.business.registrationNumber, input.business.vatNumber].filter(isNonEmpty).map(escapeHtml).join(' · ');
  const clip = clipAttribute(reportImageMask(input), 'bleed');

  return `<section class="sheet-close">
    <div class="close-top">
      ${coverLockup(input, theme)}
      <div class="close-copy">
        <h2 class="close-title">Thank you</h2>
        <p class="close-for">For choosing ${escapeHtml(input.business.name)}</p>
        <p class="close-message">${escapeHtml(message)}</p>
      </div>
    </div>
    <div class="close-hero"${clip}>
      <img class="close-photo" src="${thanksPhotoUri(input)}" alt="" />
      <div class="close-shade"></div>
      <div class="close-overlay">
        ${contacts.length > 0 ? `<ul class="cover-badges close-contacts">${contacts.join('')}</ul>` : ''}
        <div class="close-end">
          <p class="cover-tag">${COVER_TAGLINE}</p>
          ${registration ? `<p class="close-legal">${registration}</p>` : ''}
        </div>
      </div>
    </div>
  </section>`;
}

function factRow(label: string, valueHtml: string): string {
  return `<div class="fact"><dt>${escapeHtml(label)}</dt><dd>${valueHtml}</dd></div>`;
}

function workCarriedOut(input: ReportHtmlInput): string {
  if (isNonEmpty(input.job.description)) return input.job.description.trim();
  if (isNonEmpty(input.workCompleted)) {
    const items = listItems(input.workCompleted);
    if (items?.length === 1 && items[0]) return items[0];
  }
  return input.job.title;
}

function checkList(items: string[]): string {
  return `<ul class="checks">${items
    .map((item) => `<li><span class="box">✓</span><span>${escapeHtml(item)}</span></li>`)
    .join('')}</ul>`;
}

function tradeSection(number: number, title: string, body: string, options?: { titleClass?: string; sectionClass?: string }): string {
  const titleClass = options?.titleClass ? ` class="${options.titleClass}"` : '';
  const sectionClass = options?.sectionClass ? ` ${options.sectionClass}` : '';
  return `<section class="trade-block${sectionClass}"><h2 class="trade-h"><span>${number}.</span> <span${titleClass}>${escapeHtml(title)}</span></h2>${body}</section>`;
}

function tradeShot(photo: ReportPhotoData, label: 'Before' | 'After'): string {
  const caption = photoCaption(photo, label);
  const width = photo.width > 0 ? photo.width : 1600;
  const height = photo.height > 0 ? photo.height : 1200;
  const section = label === 'Before' ? 'section-before' : 'section-after';
  return `<figure class="trade-shot ${section}">
    <div class="trade-frame">
      <img src="${photo.dataUri}" width="${width}" height="${height}" alt="${escapeHtml(caption)}" />
      <figcaption class="trade-bar">${escapeHtml(caption)}</figcaption>
    </div>
  </figure>`;
}

function tradeStack(photos: ReportPhotoData[], label: 'Before' | 'After'): string {
  return photos.map((photo) => tradeShot(photo, label)).join('');
}

function tradeMast(input: ReportHtmlInput, theme: Theme): string {
  return `<header class="trade-mast">${brandLockup(input, theme)}</header>`;
}

function tradePage(input: ReportHtmlInput, theme: Theme, body: string, next: boolean): string {
  return `<article class="trade-page${next ? ' trade-next' : ''}">
    ${tradeMast(input, theme)}
    ${body}
    <p class="trade-foot">${escapeHtml(input.business.name)}</p>
  </article>`;
}

function tradeClientBody(input: ReportHtmlInput): string {
  const name = input.signature?.customerName || input.job.customerName || '';
  const when = input.signature ? formatDate(input.signature.signedAt) : '';
  const ink = input.signature ? `<div class="sign-pad">${svgWithoutHash(input.signature.svgMarkup)}</div>` : '';
  return `<p class="lede">I confirm that the above works have been completed to my satisfaction, in line with the agreed specification.</p>
    <div class="ink-sign">${ink}<div class="sign-rule"></div></div>
    <div class="sign-meta">
      <div><div class="eyebrow">Client name</div><div class="sign-name script">${name ? escapeHtml(name) : '—'}</div></div>
      <div><div class="eyebrow">Date</div><div class="sign-name">${when || '—'}</div></div>
    </div>`;
}

/** Handwritten-style mark for the tradesperson on company sign-off. */
function companySignatureSvg(stroke = '#141816'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 64" width="168" height="52" aria-hidden="true"><path d="M8 40 C 24 10, 42 56, 70 28 S 112 6, 138 36 S 168 56, 192 30" fill="none" stroke="${stroke}" stroke-width="2.3" stroke-linecap="round"/><path d="M52 48 C 78 40, 104 54, 142 44" fill="none" stroke="${stroke}" stroke-width="1.55" stroke-linecap="round"/></svg>`;
}

function tradeCompanyBody(input: ReportHtmlInput): string {
  const name = preparedBy(input);
  return `<p class="lede">I confirm that the works have been completed in accordance with our company standards and the client's requirements.</p>
    <div class="ink-sign"><div class="sign-pad company-sign">${companySignatureSvg()}</div><div class="sign-rule"></div></div>
    <div class="sign-meta">
      <div><div class="eyebrow">Supervisor</div><div class="sign-name script">${escapeHtml(name)}</div></div>
      <div><div class="eyebrow">Date</div><div class="sign-name">${formatDate(input.generatedAt)}</div></div>
    </div>`;
}

function renderTrade(input: ReportHtmlInput, theme: Theme): string {
  const chunks: string[] = [];
  let number = 1;
  const overview = `<dl class="facts">${[
    isNonEmpty(input.job.customerName) ? factRow('Client name', escapeHtml(input.job.customerName.trim())) : '',
    isNonEmpty(input.job.address) ? factRow('Project address', rich(input.job.address)) : '',
    factRow('Report date', formatDate(input.job.jobDate)),
    factRow('Work carried out', rich(workCarriedOut(input))),
    refLine(input) ? factRow('Reference', escapeHtml(refLine(input))) : '',
  ]
    .filter((row) => row.length > 0)
    .join('')}</dl>`;
  const scopeItems = listItems(input.workCompleted);
  const intro = [
    tradeSection(number++, 'Project overview', overview),
    scopeItems ? tradeSection(number++, 'Scope of work', checkList(scopeItems)) : '',
  ].join('');
  chunks.push(intro);

  const areas = (input.areas ?? []).filter((area) => area.before.length > 0 || area.after.length > 0);
  if (areas.length > 0) {
    for (const area of areas) {
      chunks.push(
        tradeSection(number++, area.name, `${tradeStack(area.before, 'Before')}${tradeStack(area.after, 'After')}`, {
          titleClass: 'area-title',
        })
      );
    }
  } else {
    if (input.before.length > 0) chunks.push(tradeSection(number++, 'Before images', tradeStack(input.before, 'Before')));
    if (input.after.length > 0) chunks.push(tradeSection(number++, 'After images', tradeStack(input.after, 'After')));
  }

  const details = [
    listSection('Materials used', input.materials, 'section-materials'),
    proseSection('Notes', input.recommendations, 'section-labour'),
    pricingSection(input),
  ].join('');
  if (details.trim()) chunks.push(tradeSection(number++, 'Details and materials', details));

  chunks.push(
    tradeSection(number++, 'Client sign-off', tradeClientBody(input), { sectionClass: 'section-signature' }) +
      tradeSection(number++, 'Company sign-off', tradeCompanyBody(input))
  );

  return `<div class="trade-pack" data-photo-count="${photoCount(input)}">${chunks
    .map((chunk, index) => tradePage(input, theme, chunk, index > 0))
    .join('')}</div>`;
}

function renderModern(input: ReportHtmlInput, theme: Theme): string {
  const ref = refLine(input);
  const photos = photosMarkup(input, (pair) => compareBlock(pair, { tags: true }));
  const overview = proseSection('Overview', input.job.description, 'section-overview');
  const work = proseSection('Work summary', input.workCompleted, 'section-work');
  const notes = cardRow([
    listSection('Materials used', input.materials, 'section-materials'),
    proseSection('Labour details', input.recommendations, 'section-labour'),
  ]);

  return `
    <header class="top">
      ${brandLockup(input, theme)}
      ${contactBlock(input)}
    </header>
    <div class="title-row">
      <div class="title-copy">
        <h1 class="display">Job report</h1>
        <p class="job-line">${escapeHtml(input.job.title)}</p>
      </div>
      <aside class="meta-card">
        ${ref ? `<div class="eyebrow">Report number</div><div class="meta-value">${escapeHtml(ref)}</div>` : ''}
        <div class="eyebrow">Date</div>
        <div class="meta-value">${formatDate(input.job.jobDate)}</div>
        <div class="eyebrow">Status</div>
        <div class="meta-value">${statusPill(input.job.status)}</div>
      </aside>
    </div>
    <div class="split">
      <div>
        <h2 class="block-title">Customer</h2>
        ${customerBlock(input) || '<p class="addr">No customer added</p>'}
      </div>
      <div class="section-details">
        <h2 class="block-title">Job details</h2>
        ${ref ? `<p class="detail"><span>Ref</span> ${escapeHtml(ref)}</p>` : ''}
        <p class="detail"><span>Job date</span> ${formatDate(input.job.jobDate)}</p>
        ${isNonEmpty(input.job.address) ? `<p class="detail"><span>Address</span> ${rich(input.job.address)}</p>` : ''}
      </div>
    </div>
    ${overview}
    ${work}
    ${photos}
    ${notes}
    ${pricingSection(input)}
    ${signatureBlock(input, 'block')}
    ${footerBlock(input)}
  `;
}

function stat(icon: string, label: string, value: string, className = ''): string {
  return `<div class="stat ${className}">
    <div class="ico-wrap">${icon}</div>
    <div>
      <div class="eyebrow">${escapeHtml(label)}</div>
      <div class="stat-value">${value}</div>
    </div>
  </div>`;
}

function renderImage(input: ReportHtmlInput, theme: Theme): string {
  const ref = refLine(input) || '—';
  const overviewSource = isNonEmpty(input.job.description) ? input.job.description : input.workCompleted;
  const overviewIsWork = !isNonEmpty(input.job.description);
  const overview = proseSection(
    'Project overview',
    overviewSource,
    overviewIsWork ? 'section-overview section-work' : 'section-overview'
  );
  const work = overviewIsWork ? '' : proseSection('Work summary', input.workCompleted, 'section-work');
  const photos = photosMarkup(input, (pair) => compareBlock(pair, { tags: true, large: true }));
  const cover = input.coverDataUri
    ? `<img class="hero-photo" src="${input.coverDataUri}" alt="" /><div class="hero-shade"></div>`
    : '';

  return `
    <header class="hero">
      ${cover}
      <div class="hero-copy">
        <div class="hero-top">
          ${brandLockup(input, theme)}
          ${contactBlock(input, 'on-dark')}
        </div>
        <p class="hero-kicker">Professional proof of every job.</p>
        <h1 class="hero-title">${escapeHtml(input.job.title)}</h1>
        ${isNonEmpty(input.job.address) ? `<p class="hero-addr">${rich(input.job.address)}</p>` : ''}
      </div>
    </header>
    <div class="stats">
      ${stat(ICON_USER, 'Customer', isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName) : '—', 'section-customer')}
      ${stat(ICON_CAL, 'Job date', formatDate(input.job.jobDate))}
      ${stat(ICON_DOC, 'Report number', escapeHtml(ref))}
    </div>
    ${overview}
    ${photos}
    ${work}
    ${cardRow([
      listSection('Materials used', input.materials, 'section-materials'),
      proseSection('Labour details', input.recommendations, 'section-labour'),
    ])}
    ${pricingSection(input)}
    ${signatureBlock(input, 'block')}
    ${footerBlock(input)}
  `;
}

function renderSide(input: ReportHtmlInput, theme: Theme): string {
  const ref = refLine(input);
  const photos = photosMarkup(input, (pair) => compareBlock(pair, { tags: true }));
  const sections: string[] = [];
  const workBody = input.workCompleted || input.job.description;
  const work = proseSection('Work summary', workBody, input.workCompleted ? 'section-work' : 'section-work section-overview');
  if (work) sections.push(work);
  if (photos) {
    sections.push(
      `<section class="block section-photos"><h2 class="block-title">Before &amp; after photos</h2>${photos}</section>`
    );
  }
  const materials = listSection('Materials used', input.materials, 'section-materials');
  if (materials) sections.push(materials);
  const pricing = pricingSection(input);
  if (pricing) sections.push(pricing);
  const signature = signatureBlock(input, 'block');
  if (signature) sections.push(signature);
  const labour = proseSection('Labour details', input.recommendations, 'section-labour');
  if (labour) sections.push(labour);
  if (isNonEmpty(input.job.description) && isNonEmpty(input.workCompleted) && input.job.description.trim() !== input.workCompleted.trim()) {
    sections.splice(1, 0, proseSection('Overview', input.job.description, 'section-overview'));
  }

  const numbered = sections
    .map(
      (section, index) => `<div class="num-row"><div class="num">${index + 1}</div><div class="num-copy">${section}</div></div>`
    )
    .join('');

  return `
    <div class="side-shell">
      <aside class="rail">
        ${brandLockup(input, theme)}
        <p class="rail-kicker">Job report</p>
        <p class="rail-tag">Quality work. Documented.</p>
        <h1 class="rail-title">${escapeHtml(input.job.title)}</h1>
        <div class="rail-block section-customer">
          <div class="eyebrow">Customer</div>
          <div class="rail-value">${isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName) : '—'}</div>
          ${isNonEmpty(input.job.address) ? `<p class="addr">${rich(input.job.address)}</p>` : ''}
        </div>
        <div class="rail-block">
          <div class="eyebrow">Date</div>
          <div class="rail-value">${formatDate(input.job.jobDate)}</div>
        </div>
        ${ref ? `<div class="rail-block"><div class="eyebrow">Reference</div><div class="rail-value">${escapeHtml(ref)}</div></div>` : ''}
        <div class="rail-block">${statusPill(input.job.status)}</div>
      </aside>
      <div class="side-main">${numbered}</div>
    </div>
    ${footerBlock(input)}
  `;
}

function infoCard(icon: string, label: string, value: string, className = ''): string {
  return `<div class="info-card ${className}">
    <div class="ico-wrap">${icon}</div>
    <div class="eyebrow">${escapeHtml(label)}</div>
    <div class="info-value">${value}</div>
  </div>`;
}

function renderCards(input: ReportHtmlInput, theme: Theme): string {
  const ref = refLine(input);
  const meta = [ref ? escapeHtml(ref) : '', formatDate(input.job.jobDate)].filter(Boolean).join(' · ');
  const cards = [
    isNonEmpty(input.job.customerName) || isNonEmpty(input.job.address)
      ? infoCard(
          ICON_USER,
          'Customer',
          `${isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName) : ''}${
            isNonEmpty(input.job.address) ? `<span class="info-sub">${rich(input.job.address)}</span>` : ''
          }`,
          'section-customer'
        )
      : '',
    infoCard(ICON_CAL, 'Job date', formatDate(input.job.jobDate)),
    ref ? infoCard(ICON_DOC, 'Reference', escapeHtml(ref)) : '',
  ].filter((card) => card.length > 0);

  return `
    <header class="top">
      ${brandLockup(input, theme)}
      <div class="head-aside">
        <div class="eyebrow">Job report</div>
        ${meta ? `<div class="head-meta">${meta}</div>` : ''}
      </div>
    </header>
    <div class="title-row tight">
      <div class="title-copy">
        <h1 class="job-title">${escapeHtml(input.job.title)}</h1>
        ${isNonEmpty(input.job.address) ? `<p class="addr">${rich(input.job.address)}</p>` : ''}
      </div>
      ${statusPill(input.job.status)}
    </div>
    <div class="info-cards">${cards.join('')}</div>
    ${extraOverview(input)}
    ${photosMarkup(input, (pair) => compareBlock(pair, { tags: true }))}
    ${cardRow([
      proseSection('Work completed', input.workCompleted || input.job.description, 'section-work'),
      listSection('Materials used', input.materials, 'section-materials'),
    ])}
    ${cardRow([proseSection('Labour details', input.recommendations, 'section-labour')])}
    ${pricingSection(input)}
    ${signatureBlock(input, 'block')}
    ${footerBlock(input)}
  `;
}

function renderMinimal(input: ReportHtmlInput, theme: Theme): string {
  const ref = refLine(input);
  const stamp = [ref, formatDate(input.job.jobDate)].filter(Boolean).join(' · ');
  const contacts = contactLines(input).map(escapeHtml).join(' · ');

  return `
    <header class="top">
      ${brandLockup(input, theme)}
      <div class="head-aside">
        <div class="eyebrow">Job report</div>
        ${stamp ? `<div class="head-meta">${escapeHtml(stamp)}</div>` : ''}
      </div>
    </header>
    <h1 class="job-title">${escapeHtml(input.job.title)}</h1>
    <div class="split rule">
      <div>
        <h2 class="block-title">Customer</h2>
        ${customerBlock(input) || '<p class="addr">—</p>'}
      </div>
      <div class="section-details">
        <h2 class="block-title">Job details</h2>
        ${ref ? `<p class="detail"><span>Ref</span> ${escapeHtml(ref)}</p>` : ''}
        <p class="detail"><span>Date</span> ${formatDate(input.job.jobDate)}</p>
        <p class="detail"><span>Status</span> ${statusLabel(input.job.status)}</p>
      </div>
    </div>
    ${photosMarkup(input, labeledCompare)}
    ${extraOverview(input)}
    ${proseSection('Work summary', input.workCompleted || input.job.description, 'section-work')}
    ${cardRow([
      listSection('Materials used', input.materials, 'section-materials'),
      proseSection('Labour details', input.recommendations, 'section-labour'),
    ])}
    ${pricingSection(input)}
    <footer class="min-foot">
      <div>
        <div class="brand-name">${escapeHtml(input.business.name)}</div>
        ${contacts ? `<p class="addr">${contacts}</p>` : ''}
        ${isNonEmpty(input.business.footerMessage) ? `<p class="footer-message">${escapeHtml(input.business.footerMessage)}</p>` : ''}
        <p class="footer-meta">Generated ${formatDateTime(input.generatedAt)} · Created with Trade Report</p>
      </div>
      ${signatureBlock(input, 'inline')}
    </footer>
  `;
}

function asColumn(section: string): string {
  return section.replace('class="block ', 'class="block trio-col ');
}

function renderDark(input: ReportHtmlInput, theme: Theme): string {
  const ref = refLine(input);
  const columns = [
    `<div class="trio-col section-customer"><h2 class="block-title">Customer</h2>${customerBlock(input) || '<p class="addr">—</p>'}</div>`,
    asColumn(proseSection('Work summary', input.workCompleted || input.job.description, 'section-work')),
    asColumn(listSection('Materials used', input.materials, 'section-materials')),
  ].filter((column) => column.trim().length > 0);

  const materialsMissing = !listSection('Materials used', input.materials, 'section-materials');
  const labour = proseSection('Labour details', input.recommendations, 'section-labour');
  if (materialsMissing && labour) columns.push(asColumn(labour));

  return `
    <header class="dark-head">
      <div class="dark-top">
        ${brandLockup(input, theme)}
        ${contactBlock(input, 'on-dark')}
      </div>
      <div class="dark-title-row">
        <div>
          <p class="eyebrow on-dark">Job report</p>
          <h1 class="hero-title">${escapeHtml(input.job.title)}</h1>
        </div>
        <div class="dark-meta">
          ${ref ? `<div class="dark-ref">${escapeHtml(ref)}</div>` : ''}
          <div class="dark-date">${formatDate(input.job.jobDate)}</div>
          ${statusPill(input.job.status)}
        </div>
      </div>
    </header>
    <div class="dark-main">
      ${extraOverview(input)}
      <div class="trio">${columns.join('')}</div>
      ${photosMarkup(input, filmstrip)}
      ${materialsMissing ? '' : labour}
      ${pricingSection(input)}
      ${signatureBlock(input, 'block')}
      ${footerBlock(input)}
    </div>
  `;
}

function stylesheet(theme: Theme): string {
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html { background: ${cssColor(PAPER)}; }
  body {
    margin: 0 auto;
    max-width: 210mm;
    padding: 0;
    color: ${cssColor(INK)};
    background: ${cssColor(PAPER)};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
  }
  .sheet-body {
    padding: 14mm 15mm 16mm;
    background: ${cssColor(PAPER)};
  }
  img { max-width: 100%; }
  p { margin: 0; }
  h1, h2, h3 { margin: 0; page-break-after: avoid; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; margin-bottom: 8mm; }
  .brand { display: flex; align-items: center; gap: 2.8mm; min-width: 0; }
  .logo {
    width: 9mm; height: 9mm; border-radius: 2.2mm; object-fit: cover; flex-shrink: 0; display: block;
  }
  .logo-fallback {
    display: flex; align-items: center; justify-content: center;
    font-size: 12pt; font-weight: 800;
  }
  .brand-name { font-size: 12.5pt; font-weight: 700; letter-spacing: -0.02em; }
  .contact { text-align: right; font-size: 8pt; line-height: 1.45; color: ${cssColor(MUTED)}; max-width: 46%; }
  .contact.on-dark { color: rgba(255,255,255,0.78); }
  .eyebrow {
    font-size: 7.4pt; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: ${cssColor(MUTED)};
  }
  .eyebrow.on-dark { color: rgba(255,255,255,0.62); }
  .display {
    font-size: 28pt; font-weight: 800; letter-spacing: -0.035em; line-height: 0.95;
    text-transform: uppercase;
  }
  .job-title { font-size: 26pt; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; }
  .job-line { margin-top: 2.2mm; font-size: 13pt; font-weight: 600; letter-spacing: -0.01em; }
  .title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; }
  .title-row.tight { align-items: center; margin-bottom: 5mm; }
  .title-copy { min-width: 0; flex: 1; }
  .meta-card {
    width: 48mm; flex-shrink: 0;
    border: 1px solid ${cssColor(LINE)}; border-radius: 3mm;
    padding: 3.4mm 3.8mm 2.4mm;
  }
  .meta-value { margin: 0.7mm 0 2.6mm; font-size: 10.5pt; font-weight: 700; }
  .meta-card .meta-value:last-child { margin-bottom: 0.4mm; }
  .status {
    display: inline-flex; align-items: center; gap: 1mm;
    border-radius: 999px; padding: 0.9mm 2.3mm;
    font-size: 8pt; font-weight: 700; letter-spacing: 0.01em;
    line-height: 1.2;
  }
  .status-done { background: ${theme.accent}; color: ${theme.onAccent}; }
  .status-open { background: ${cssColor(WASH)}; color: ${cssColor(INK)}; border: 1px solid ${cssColor(LINE)}; }
  .tick { font-size: 8pt; }
  .split { display: flex; gap: 8mm; margin: 7mm 0 6mm; }
  .split > div { flex: 1; min-width: 0; }
  .split.rule { padding-top: 4mm; border-top: 1px solid ${cssColor(LINE)}; }
  .block { margin: 0 0 6mm; }
  .block-title { font-size: 13pt; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 1.8mm; }
  .area-block { margin: 1mm 0 5mm; }
  .area-title { font-size: 12.5pt; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 2mm; }
  .area-block .compare, .area-block .shot-grid, .area-block .filmstrip { margin-top: 0; }
  .prose p { margin: 0 0 2mm; }
  .prose p:last-child { margin-bottom: 0; }
  .person { font-size: 12.5pt; font-weight: 700; margin-bottom: 0.8mm; }
  .addr { color: ${cssColor(MUTED)}; font-size: 10pt; }
  .detail { margin: 0 0 1.4mm; font-size: 10.5pt; }
  .detail span {
    display: inline-block; min-width: 18mm; margin-right: 2mm;
    color: ${cssColor(MUTED)}; font-size: 8pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .lede { color: ${cssColor(MUTED)}; font-size: 9.5pt; margin: 0 0 3mm; }
  .bullets { margin: 0; padding: 0 0 0 4.2mm; }
  .bullets li { margin: 0 0 1.1mm; padding: 0; }
  .bullets li::marker { color: ${theme.accent}; }
  .card-row { display: flex; gap: 3.5mm; align-items: stretch; margin: 1mm 0 6mm; }
  .card-row .block {
    flex: 1; min-width: 0; margin: 0;
    background: ${cssColor(WASH)}; border-radius: 3mm; padding: 4mm 4.2mm;
  }
  .card-row .block-title { font-size: 11.5pt; }
  .photos, .compare, .shot-grid, .filmstrip { margin: 1mm 0 6mm; }
  .compare { display: flex; gap: 3.5mm; align-items: flex-start; }
  .compare-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3mm; }
  .shot-grid { display: flex; flex-wrap: wrap; gap: 3.5mm; }
  .shot-grid .shot { width: calc((100% - 3.5mm) / 2); }
  .shot-grid.one .shot { width: 100%; }
  .shot { margin: 0; break-inside: avoid; page-break-inside: avoid; }
  .shot-frame {
    position: relative; width: 100%; overflow: hidden;
    border-radius: 2.4mm; background: rgb(231, 235, 231);
  }
  .shot-frame img { display: block; width: 100%; height: 58mm; object-fit: cover; }
  .compare.large .shot-frame img { height: 64mm; }
  .shot-grid.one .shot-frame img { height: 105mm; }
  .photo-tag {
    position: absolute; left: 2.2mm; top: 2.2mm;
    background: ${cssColor(PAPER)}; color: ${cssColor(INK)};
    font-size: 7.2pt; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 0.7mm 2mm; border-radius: 999px;
  }
  .shot figcaption { margin-top: 1.4mm; font-size: 8pt; line-height: 1.35; color: ${cssColor(MUTED)}; }
  .col-label { font-size: 12pt; font-weight: 700; margin: 0 0 2mm; }
  .signoff, .meta-card, .info-card, .stat, .text-card { break-inside: avoid; page-break-inside: avoid; }
  .signoff { margin-top: 2mm; }
  .sign-pad {
    background: ${cssColor(WASH)}; border: 1px solid ${cssColor(LINE)}; border-radius: 2.4mm;
    padding: 2mm 4mm; margin-bottom: 3mm;
  }
  .sign-pad svg { width: 58mm; height: auto; display: block; }
  .sign-meta { display: flex; gap: 12mm; }
  .sign-name { margin-top: 0.6mm; font-size: 11pt; font-weight: 700; }
  .sign-inline { text-align: right; }
  .sign-inline .sign-pad { background: transparent; border: none; padding: 0; margin: 0 0 1mm auto; }
  .sign-inline .sign-pad svg { margin-left: auto; }
  .sign-when { color: ${cssColor(MUTED)}; font-size: 8.5pt; }
  .doc-footer {
    margin-top: 8mm; padding-top: 3.5mm; border-top: 1px solid ${cssColor(LINE)};
    text-align: center; color: ${cssColor(MUTED)}; font-size: 8pt; line-height: 1.45;
  }
  .doc-footer p { margin: 0 0 0.5mm; }
  .footer-message { color: ${cssColor(INK)}; font-size: 10pt; font-weight: 600; margin-bottom: 1.2mm !important; }
  .min-foot .footer-message { text-align: left; }
  .footer-meta { margin-top: 1.2mm !important; }
  .head-aside { text-align: right; }
  .head-meta { margin-top: 0.8mm; font-size: 9pt; font-weight: 600; }

  .sheet-body.template-image { padding-top: 12mm; }
  .hero {
    position: relative; overflow: hidden;
    background: ${cssColor(HERO)}; color: ${cssColor(PAPER)};
    border-radius: 3.2mm; padding: 7mm 7mm 8mm; margin-bottom: 5mm;
    break-inside: avoid; page-break-inside: avoid;
  }
  .hero-photo {
    position: absolute; left: 0; top: 0; width: 100%; height: 100%;
    object-fit: cover; display: block;
  }
  .hero-shade {
    position: absolute; left: 0; top: 0; width: 100%; height: 100%;
    background: linear-gradient(180deg, rgba(18,22,20,0.22) 0%, rgba(18,22,20,0.82) 78%);
  }
  .hero-copy { position: relative; z-index: 1; }
  .hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 6mm; margin-bottom: 8mm; }
  .hero .brand-name, .dark-head .brand-name { color: ${cssColor(PAPER)}; }
  .hero .logo-fallback, .dark-head .logo-fallback { background: ${theme.accent}; color: ${theme.onAccent}; }
  .hero-kicker { color: rgba(255,255,255,0.72); font-size: 11pt; margin-bottom: 2mm; }
  .hero-title { color: ${cssColor(PAPER)}; font-size: 32pt; font-weight: 800; letter-spacing: -0.035em; line-height: 1.02; }
  .hero-addr { margin-top: 2.5mm; color: rgba(255,255,255,0.8); font-size: 11pt; }
  .stats { display: flex; gap: 3mm; margin: 0 0 6mm; }
  .stat {
    flex: 1; min-width: 0; display: flex; gap: 2.6mm; align-items: flex-start;
    background: ${cssColor(WASH)}; border-radius: 2.6mm; padding: 3.2mm;
  }
  .ico-wrap {
    width: 8mm; height: 8mm; border-radius: 2mm; flex-shrink: 0;
    background: ${theme.tint}; color: ${theme.accent};
    display: flex; align-items: center; justify-content: center;
  }
  .ico-wrap svg { width: 4.4mm; height: 4.4mm; }
  .stat .ico-wrap { margin-top: 0.3mm; }
  .stat-value { margin-top: 0.6mm; font-size: 10.5pt; font-weight: 700; }

  .sheet-body.template-side { background: ${theme.tint}; }
  .side-shell { display: flex; gap: 6mm; align-items: flex-start; }
  .rail { width: 52mm; flex-shrink: 0; }
  .rail-kicker { margin-top: 6mm; font-size: 16pt; font-weight: 800; letter-spacing: -0.03em; }
  .rail-tag { margin-top: 1mm; color: ${cssColor(MUTED)}; font-size: 9.5pt; }
  .rail-title { margin-top: 4mm; font-size: 13pt; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; }
  .rail-block { margin-top: 4.5mm; }
  .rail-value { margin-top: 0.6mm; font-size: 10.5pt; font-weight: 700; }
  .side-main { flex: 1; min-width: 0; }
  .num-row { display: flex; gap: 3mm; margin-bottom: 5mm; }
  .num { width: 6mm; flex-shrink: 0; font-size: 13pt; font-weight: 800; line-height: 1.2; }
  .num-copy { flex: 1; min-width: 0; }
  .num-copy .block { margin-bottom: 0; }
  .template-side .doc-footer { border-top-color: rgba(20,24,22,0.12); }

  .info-cards { display: flex; gap: 3mm; margin: 0 0 5mm; }
  .info-card {
    flex: 1; min-width: 0;
    border: 1px solid ${cssColor(LINE)}; border-radius: 3mm; padding: 3.4mm;
    background: ${cssColor(PAPER)};
  }
  .info-card .ico-wrap { margin-bottom: 2.4mm; }
  .info-value { margin-top: 1mm; font-size: 11pt; font-weight: 700; }
  .info-sub { display: block; margin-top: 0.6mm; color: ${cssColor(MUTED)}; font-size: 8.5pt; font-weight: 500; }

  .template-minimal .job-title { margin: 1mm 0 2mm; }
  .min-foot {
    display: flex; justify-content: space-between; align-items: flex-end; gap: 8mm;
    margin-top: 4mm; padding-top: 4mm; border-top: 1px solid ${cssColor(LINE)};
  }
  .min-foot .brand-name { font-size: 11pt; }

  .sheet-body.template-dark { padding: 0 0 14mm; }
  .dark-head { background: ${cssColor(HERO)}; color: ${cssColor(PAPER)}; padding: 12mm 15mm 10mm; }
  .dark-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; }
  .dark-title-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 8mm; margin-top: 8mm; }
  .dark-meta { text-align: right; }
  .dark-ref { font-size: 11pt; font-weight: 700; }
  .dark-date { margin: 1mm 0 2.2mm; color: rgba(255,255,255,0.75); font-size: 10pt; }
  .dark-main { padding: 6mm 15mm 0; }
  .trio { display: flex; gap: 5mm; align-items: flex-start; margin-bottom: 5mm; }
  .trio-col { flex: 1; min-width: 0; margin: 0; }
  .filmstrip { display: flex; flex-wrap: wrap; gap: 2.4mm; }
  .filmstrip .shot { width: calc((100% - 9.6mm) / 5); }
  .filmstrip.one .shot { width: 48%; }
  .filmstrip.few .shot { width: calc((100% - 2.4mm) / 2); }
  .filmstrip.three .shot { width: calc((100% - 4.8mm) / 3); }
  .filmstrip .shot-frame img { height: 32mm; }
  .filmstrip.one .shot-frame img { height: 78mm; }
  .filmstrip.few .shot-frame img { height: 72mm; }
  .filmstrip.three .shot-frame img { height: 48mm; }
  .filmstrip .shot-frame { border-radius: 1.8mm; }
  .filmstrip .photo-tag { font-size: 6.4pt; left: 1.3mm; top: 1.3mm; padding: 0.5mm 1.5mm; }
  .filmstrip .shot figcaption {
    font-size: 7pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .section-pricing { break-inside: avoid; page-break-inside: avoid; }
  .price-table { width: 100%; border-collapse: collapse; margin-top: 1mm; }
  .price-table th {
    text-align: left; font-size: 7.4pt; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: ${cssColor(MUTED)};
    padding: 0 3mm 1.6mm 0; border-bottom: 1px solid ${cssColor(LINE)};
  }
  .price-table td {
    padding: 2.2mm 3mm 2.2mm 0; border-bottom: 1px solid ${cssColor(LINE)};
    vertical-align: top; font-size: 10pt;
  }
  .price-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .price-table tfoot td { font-weight: 700; border-bottom: none; }

  .sheet-cover, .sheet-close {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    overflow: hidden;
    background: ${cssColor(HERO)};
    color: rgb(255, 255, 255);
    box-sizing: border-box;
  }
  .sheet-cover {
    display: flex;
    flex-direction: column;
    padding: 14mm 0 12mm;
    break-after: page;
    page-break-after: always;
  }
  .sheet-close {
    display: flex;
    flex-direction: column;
    padding: 16mm 0 0;
    break-before: page;
    page-break-before: always;
    break-after: avoid;
    page-break-after: avoid;
  }
  .cover-lockup { text-align: center; padding: 0 16mm; }
  .cover-lockup .logo { width: 16mm; height: 16mm; margin: 0 auto 3mm; border-radius: 3mm; }
  .cover-name {
    color: ${theme.onCover};
    font-size: 13pt;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .cover-tag {
    margin-top: 1.4mm;
    color: rgba(255, 255, 255, 0.72);
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .cover-title {
    margin-top: 8mm;
    padding: 0 16mm;
    color: rgb(255, 255, 255);
    font-size: 34pt;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 0.95;
    text-transform: uppercase;
  }
  .cover-rule { width: 36mm; height: 0.55mm; margin: 3.5mm 0 4.5mm 16mm; background: ${theme.onCover}; }
  .cover-meta { margin: 0; padding: 0 16mm; }
  .cover-meta .fact { display: block; margin: 0 0 2.6mm; }
  .cover-meta dt {
    font-size: 7.6pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${theme.onCover};
  }
  .cover-meta dd { margin: 0.5mm 0 0; font-size: 11.5pt; font-weight: 600; color: rgb(255, 255, 255); }
  .cover-hero {
    position: relative;
    flex: 1;
    align-self: stretch;
    width: 100%;
    min-height: 62mm;
    margin: 5mm 0 0;
    overflow: hidden;
    border: none;
    border-radius: 0;
    background: transparent;
  }
  .cover-photo { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; display: block; border: none; border-radius: 0; }
  .cover-badges {
    list-style: none;
    display: flex;
    gap: 3mm;
    margin: 5mm 0 0;
    padding: 4mm 16mm 0;
    border-top: 1px solid rgba(255, 255, 255, 0.16);
  }
  .cover-badge, .close-contact { flex: 1; min-width: 0; text-align: center; }
  .cover-ico {
    width: 8mm; height: 8mm; margin: 0 auto 1.4mm;
    border: 1px solid rgba(255, 255, 255, 0.38);
    border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    color: ${theme.onCover};
  }
  .cover-ico svg { width: 4.2mm; height: 4.2mm; }
  .cover-badge-label {
    display: block;
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.62);
  }
  .cover-badge-value {
    display: block;
    margin-top: 0.6mm;
    font-size: 8.5pt;
    font-weight: 700;
    line-height: 1.25;
    max-height: 2.6em;
    overflow: hidden;
  }
  .close-copy { text-align: center; padding: 0 16mm; }
  .close-title {
    color: rgb(255, 255, 255);
    font-size: 32pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .close-for {
    margin-top: 2mm;
    color: ${theme.onCover};
    font-size: 11pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .close-message {
    margin: 6mm auto 0;
    max-width: 130mm;
    color: rgba(255, 255, 255, 0.82);
    font-size: 11pt;
    line-height: 1.5;
  }
  .close-top { flex: 0 0 auto; }
  .close-hero {
    position: relative;
    flex: 1 1 auto;
    align-self: stretch;
    width: 100%;
    min-height: 108mm;
    margin: 6mm 0 0;
    overflow: hidden;
    border: none;
    border-radius: 0;
    background: transparent;
  }
  .close-photo { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: cover; display: block; border: none; border-radius: 0; }
  .close-shade {
    position: absolute;
    left: 0; right: 0; top: 0; bottom: 0;
    background: linear-gradient(to bottom, rgba(18, 22, 20, 0) 0%, rgba(18, 22, 20, 0) 34%, rgba(18, 22, 20, 0.62) 64%, rgba(18, 22, 20, 0.92) 100%);
  }
  .close-overlay {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    z-index: 1;
    padding-bottom: 12mm;
  }
  .close-contacts { border-top: none; margin-top: 0; padding-top: 0; text-align: center; }
  .close-end { text-align: center; padding: 0 16mm; }
  .close-legal { margin-top: 1.5mm; color: rgba(255, 255, 255, 0.55); font-size: 8pt; }

  .sheet-cover[data-cover="bleed"] { position: relative; display: block; padding: 0; }
  .sheet-cover[data-cover="bleed"] .cover-photo { z-index: 0; }
  .bleed-shade {
    position: absolute;
    left: 0; right: 0; top: 0; bottom: 0;
    z-index: 1;
    background: linear-gradient(to bottom, rgba(18, 22, 20, 0.88) 0%, rgba(18, 22, 20, 0.28) 24%, rgba(18, 22, 20, 0.05) 46%, rgba(18, 22, 20, 0.45) 68%, rgba(18, 22, 20, 0.94) 100%);
  }
  .bleed-top, .bleed-bottom { position: absolute; left: 0; right: 0; z-index: 2; }
  .bleed-top { top: 0; padding: 16mm 16mm 0; }
  .bleed-bottom { bottom: 0; padding: 0 16mm 12mm; }
  .sheet-cover[data-cover="bleed"] .cover-lockup,
  .sheet-cover[data-cover="bleed"] .cover-title,
  .sheet-cover[data-cover="bleed"] .cover-meta,
  .sheet-cover[data-cover="bleed"] .cover-badges { padding-left: 0; padding-right: 0; }
  .sheet-cover[data-cover="bleed"] .cover-title { margin-top: 0; }
  .sheet-cover[data-cover="bleed"] .cover-rule { margin-left: 0; }

  .sheet-cover[data-cover="split"] {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    padding: 0;
  }
  .split-copy {
    width: 92mm;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 16mm 8mm 12mm 12mm;
    min-width: 0;
  }
  .split-photo {
    position: relative;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    background: transparent;
  }
  .sheet-cover[data-cover="split"] .cover-lockup { text-align: left; padding: 0; }
  .sheet-cover[data-cover="split"] .cover-lockup .logo { margin: 0 0 3mm; }
  .sheet-cover[data-cover="split"] .cover-name { font-size: 11pt; letter-spacing: 0.08em; overflow-wrap: anywhere; }
  .sheet-cover[data-cover="split"] .cover-title { margin-top: 7mm; padding: 0; font-size: 28pt; }
  .sheet-cover[data-cover="split"] .cover-rule { margin-left: 0; }
  .sheet-cover[data-cover="split"] .cover-meta { padding: 0; }
  .sheet-cover[data-cover="split"] .cover-meta dd { font-size: 10.5pt; }
  .sheet-cover[data-cover="split"] .split-badges {
    flex-direction: column;
    gap: 3.5mm;
    margin-top: auto;
    padding: 4mm 0 0;
  }
  .sheet-cover[data-cover="split"] .cover-badge { text-align: left; }
  .sheet-cover[data-cover="split"] .cover-ico { margin: 0 0 1.4mm; }

  .sheet-cover[data-cover="poster"] {
    display: flex;
    flex-direction: column;
    padding: 16mm 14mm 12mm;
  }
  .poster-head { flex: 0 0 auto; }
  .sheet-cover[data-cover="poster"] .cover-lockup { text-align: left; padding: 0; }
  .sheet-cover[data-cover="poster"] .cover-lockup .logo { margin: 0 0 3mm; }
  .poster-title {
    margin-top: 6mm;
    color: ${theme.onCover};
    font-size: 52pt;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 0.86;
    text-transform: uppercase;
  }
  .sheet-cover[data-cover="poster"] .cover-rule { margin: 4mm 0 0; }
  .poster-photo {
    position: relative;
    flex: 1 1 auto;
    min-height: 78mm;
    margin: 8mm 0 6mm;
    overflow: hidden;
    background: transparent;
  }
  .poster-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2mm 6mm;
    padding: 0;
  }
  .poster-meta .fact { width: calc(50% - 3mm); margin: 0; }
  .sheet-cover[data-cover="poster"] .cover-badges { margin-top: 4mm; padding: 4mm 0 0; }

  .trade-page { break-inside: auto; }
  .trade-next { break-before: page; page-break-before: always; }
  @media screen {
    .trade-next { margin-top: 8mm; padding-top: 2mm; }
  }
  .trade-mast { text-align: center; margin-bottom: 7mm; }
  .trade-mast .brand { justify-content: center; }
  .trade-mast .brand-name {
    color: ${theme.accent};
    font-size: 8.5pt;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .trade-h {
    display: flex;
    gap: 2.2mm;
    align-items: baseline;
    margin: 0 0 4mm;
    padding-bottom: 2mm;
    border-bottom: 0.55mm solid ${theme.accent};
    font-size: 12pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .trade-h span:first-child { color: ${theme.accent}; }
  .trade-block + .trade-block { margin-top: 7mm; }
  .facts { margin: 0; }
  .facts .fact {
    display: flex;
    gap: 4mm;
    padding: 2.5mm 0;
    border-bottom: 1px solid ${cssColor(LINE)};
  }
  .facts dt {
    width: 40mm;
    flex-shrink: 0;
    color: ${cssColor(MUTED)};
    font-size: 10pt;
  }
  .facts dd { margin: 0; font-weight: 600; }
  .checks { list-style: none; margin: 0; padding: 0; }
  .checks li {
    display: flex;
    gap: 3mm;
    align-items: flex-start;
    padding: 2.2mm 0;
    border-bottom: 1px solid ${cssColor(LINE)};
  }
  .box {
    width: 4.4mm;
    height: 4.4mm;
    margin-top: 0.4mm;
    border: 0.4mm solid ${theme.accent};
    border-radius: 0.7mm;
    color: ${theme.accent};
    font-size: 8pt;
    line-height: 4mm;
    text-align: center;
    flex-shrink: 0;
  }
  .trade-shot { margin: 0 0 3.5mm; break-inside: avoid; page-break-inside: avoid; }
  .trade-frame { position: relative; overflow: hidden; background: rgb(231, 235, 231); }
  .trade-frame img { display: block; width: 100%; height: 62mm; object-fit: cover; }
  .trade-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 2mm 3.5mm;
    background: rgba(12, 14, 13, 0.82);
    color: rgb(255, 255, 255);
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .ink-sign { margin: 2mm 0 3mm; max-width: 90mm; }
  .ink-sign .sign-pad { background: transparent; border: none; padding: 0; margin: 0 0 1mm; }
  .ink-sign .company-sign { min-height: 14mm; display: flex; align-items: flex-end; }
  .ink-sign .company-sign svg { display: block; max-width: 100%; height: auto; }
  .sign-rule { border-bottom: 0.45mm solid ${theme.accent}; min-height: 2mm; }
  .script { font-family: "Segoe Script", "Snell Roundhand", "Apple Chancery", cursive; font-weight: 500; }
  .trade-foot {
    margin-top: 8mm;
    padding-top: 2.5mm;
    border-top: 1px solid ${cssColor(LINE)};
    color: ${cssColor(MUTED)};
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .sheet-basic { padding: 16mm 16mm 18mm; }
  .sheet-basic .display,
  .sheet-basic .job-title {
    font-size: 16pt;
    font-weight: 650;
    letter-spacing: 0;
    line-height: 1.2;
  }
  .sheet-basic .meta-card,
  .sheet-basic .info-card,
  .sheet-basic .text-card,
  .sheet-basic .stat {
    background: transparent;
    border-radius: 0;
    box-shadow: none;
  }
  .sheet-basic .logo,
  .sheet-basic .shot-frame,
  .sheet-basic .compare img {
    border-radius: 0;
  }
  .sheet-basic .status,
  .sheet-basic .status-done {
    background: rgb(92, 101, 96);
    border-radius: 0;
  }
  `;
}

function renderInterior(template: ReportTemplateId, input: ReportHtmlInput, theme: Theme): string {
  if (template === 'trade') return renderTrade(input, theme);
  if (template === 'image') return renderImage(input, theme);
  if (template === 'side') return renderSide(input, theme);
  if (template === 'cards') return renderCards(input, theme);
  if (template === 'minimal') return renderMinimal(input, theme);
  if (template === 'dark') return renderDark(input, theme);
  return renderModern(input, theme);
}

function renderTemplate(template: ReportTemplateId, input: ReportHtmlInput, theme: Theme): string {
  const basic = isFreeReportTemplate(template);
  const interior = `<section class="template-${template} sheet-body${basic ? ' sheet-basic' : ''}">${renderInterior(template, input, theme)}</section>`;
  if (basic) return interior;
  return `${renderCover(input, theme)}${interior}${renderClose(input, theme)}`;
}

export function buildReportHtml(input: ReportHtmlInput): string {
  const template = normalizeReportTemplateId(input.template);
  const theme = buildTheme(input.business.accentColor || FALLBACK_ACCENT);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
${stylesheet(theme)}
</style>
</head>
<body data-template="${template}" data-tier="${isFreeReportTemplate(template) ? 'basic' : 'pro'}">
${renderTemplate(template, input, theme)}
</body>
</html>`;
}

/**
 * Screen-only chrome for the in-app preview: fixed A4 page frames (210×297mm)
 * stacked like a PDF viewer. Print HTML is unchanged — pagination there still
 * comes from @page / break-* rules.
 */
const PREVIEW_SCREEN_CSS = `
html { background: #dfe3df; overflow-x: hidden; }
body {
  margin: 0;
  background: transparent;
  width: 210mm;
  max-width: 210mm;
  transform-origin: top left;
}
.sheet-cover,
.sheet-close,
body:not([data-template="trade"]) .sheet-body,
body[data-template="trade"] .trade-page {
  width: 210mm;
  height: 297mm;
  max-height: 297mm;
  aspect-ratio: 210 / 297;
  overflow: hidden;
  box-sizing: border-box;
  box-shadow: 0 10px 28px rgba(16, 22, 18, 0.12);
  margin: 0 0 12px;
}
body[data-template="trade"] .sheet-body {
  padding: 0;
  background: transparent;
  box-shadow: none;
  margin: 0;
  width: 210mm;
  height: auto;
  max-height: none;
  overflow: visible;
}
body[data-template="trade"] .trade-page {
  padding: 14mm 15mm 16mm;
  background: ${cssColor(PAPER)};
}
body[data-template="trade"] .trade-next {
  margin-top: 0;
  padding-top: 14mm;
}
`.trim();

/** Splits overflowing A4 frames into extra pages, then scales the stack to the viewport width. */
const PREVIEW_SCREEN_SCRIPT = `(function(){
  var PAGE_SELECTOR = 'body[data-template="trade"] .trade-page, body:not([data-template="trade"]) .sheet-body';
  function overflows(el){
    return el.scrollHeight > el.clientHeight + 1;
  }
  function splitOversizedChild(page){
    var only = page.children[0];
    if (!only || only.children.length < 2) return false;
    var cont = page.cloneNode(false);
    var contInner = only.cloneNode(false);
    cont.appendChild(contInner);
    page.parentNode.insertBefore(cont, page.nextSibling);
    while (overflows(page) && only.children.length > 1) {
      contInner.insertBefore(only.lastElementChild, contInner.firstChild);
    }
    if (!contInner.children.length) {
      cont.parentNode.removeChild(cont);
      return false;
    }
    return cont;
  }
  function paginate(page){
    var guard = 0;
    while (overflows(page) && guard++ < 40) {
      if (page.children.length < 2) {
        var nested = splitOversizedChild(page);
        if (!nested) break;
        page = nested;
        continue;
      }
      var cont = page.cloneNode(false);
      page.parentNode.insertBefore(cont, page.nextSibling);
      while (overflows(page) && page.children.length > 1) {
        cont.insertBefore(page.lastElementChild, cont.firstChild);
      }
      if (!cont.children.length) {
        cont.parentNode.removeChild(cont);
        break;
      }
      page = cont;
    }
  }
  function paginateAll(){
    var pages = Array.prototype.slice.call(document.querySelectorAll(PAGE_SELECTOR));
    for (var i = 0; i < pages.length; i++) paginate(pages[i]);
  }
  function unscale(){
    var b = document.body;
    b.style.transform = 'none';
    b.style.marginBottom = '0px';
  }
  function fit(){
    unscale();
    var b = document.body;
    var w = b.offsetWidth;
    var view = document.documentElement.clientWidth;
    if (!w || !view) return;
    var s = Math.min(1, view / w);
    b.style.transform = 'scale(' + s + ')';
    b.style.marginBottom = (b.offsetHeight * (s - 1)) + 'px';
  }
  function schedule(){
    unscale();
    paginateAll();
    fit();
    requestAnimationFrame(fit);
  }
  schedule();
  window.addEventListener('resize', fit);
  window.addEventListener('load', schedule);
  Array.prototype.forEach.call(document.images, function(img){
    if (!img.complete) img.addEventListener('load', schedule);
  });
})();`;

/** Same document as the PDF, scaled to the preview width so each A4 page stays readable. */
export function buildReportPreviewHtml(input: ReportHtmlInput): string {
  return buildReportHtml(input)
    .replace(
      '</head>',
      `<meta name="viewport" content="width=device-width, initial-scale=1" /><style id="preview-screen">${PREVIEW_SCREEN_CSS}</style></head>`
    )
    .replace('</body>', `<script>${PREVIEW_SCREEN_SCRIPT}</script></body>`);
}
