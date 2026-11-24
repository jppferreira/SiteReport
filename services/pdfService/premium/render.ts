import { formatDate } from '@/utils/format';
import { ReportTemplateId } from '@/models';

import { ReportHtmlInput } from '../types';

import {
  SVG_APERTURE,
  SVG_CAL,
  SVG_DIAMOND,
  SVG_LEAF,
  SVG_LOCK,
  SVG_PIN,
  SVG_ROOF,
  SVG_SHIELD,
  SVG_SUN,
  SVG_TICK,
} from './assets';
import {
  atelierSwatches,
  businessTagline,
  checklistAllPassed,
  coverPhotoUri,
  descriptionExcerpt,
  editTextAttrs,
  escapeHtml,
  isNonEmpty,
  listItems,
  premAftercare,
  premChecklist,
  premCircuitPassTable,
  premCoverDocTitle,
  premDarkSignoff,
  premFooter,
  premGalleryGrid,
  premHandoverChecklist,
  premLogo,
  premMaterialsList,
  premMetaCols,
  premPhotosBlock,
  premPhotosNumbered,
  premShot,
  premPricing,
  premReviewStrip,
  premScopeCards,
  premSectionHead,
  premSignatureStrip,
  premSystemStatus,
  premWorkBullets,
  premWorkSafetyCols,
  PremiumTheme,
  preparedBy,
  refLine,
  rich,
} from './shared';

function coverPhoto(input: ReportHtmlInput, className = 'prem-cover-photo'): string {
  return `<img class="${className}" src="${coverPhotoUri(input)}" alt="" data-preview-edit="cover" />`;
}

function jobTitle(input: ReportHtmlInput, className: string, tag: 'h1' | 'h2' = 'h1'): string {
  return `<${tag} class="${className}" ${editTextAttrs('title')}>${escapeHtml(input.job.title)}</${tag}>`;
}

function jobAddress(input: ReportHtmlInput, className: string, prefix = ''): string {
  if (!isNonEmpty(input.job.address)) return '';
  return `<p class="${className}" ${editTextAttrs('address')}>${prefix}${rich(input.job.address)}</p>`;
}

function thermalSpineMeta(input: ReportHtmlInput): string {
  const rows = [
    isNonEmpty(input.job.customerName)
      ? `<div class="therm-meta-row" ${editTextAttrs('customer')}><span class="therm-meta-k">Client</span><span class="therm-meta-v">${escapeHtml(input.job.customerName.trim())}</span></div>`
      : `<div class="therm-meta-row preview-only-edit" ${editTextAttrs('customer')}><span class="therm-meta-k">Client</span><span class="therm-meta-v">Tap to add</span></div>`,
    isNonEmpty(input.job.address)
      ? `<div class="therm-meta-row" ${editTextAttrs('address')}><span class="therm-meta-k">Property</span><span class="therm-meta-v">${rich(input.job.address)}</span></div>`
      : `<div class="therm-meta-row preview-only-edit" ${editTextAttrs('address')}><span class="therm-meta-k">Property</span><span class="therm-meta-v">Tap to add</span></div>`,
    `<div class="therm-meta-row"><span class="therm-meta-k">Service date</span><span class="therm-meta-v">${formatDate(input.job.jobDate)}</span></div>`,
    `<div class="therm-meta-row"><span class="therm-meta-k">Engineer</span><span class="therm-meta-v">${escapeHtml(preparedBy(input))}</span></div>`,
  ].filter(Boolean);
  return rows.join('');
}

function renderThermal(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const excerpt = descriptionExcerpt(input);
  const status = premSystemStatus(input);
  const verified =
    checklistAllPassed(input) ? `<span class="therm-verified">${SVG_SHIELD} Verified</span>` : '';

  const cover = `<section class="sheet-cover premium-cover template-thermal-cover">
    <div class="therm-spine">
      <div class="therm-spine-grid" aria-hidden="true"></div>
      <div class="therm-spine-inner">
        ${premLogo(input, theme)}
        <p class="therm-biz">${escapeHtml(input.business.name.toUpperCase())}</p>
        <p class="therm-tagline">${escapeHtml(businessTagline(input, 'HEATING · GAS · RENEWABLES'))}</p>
        <div class="therm-status"><span class="therm-status-dot"></span>${escapeHtml(status)}</div>
        <p class="therm-hairline"></p>
        ${thermalSpineMeta(input)}
        <p class="therm-spine-foot">Prepared with Trade Report</p>
      </div>
    </div>
    <div class="therm-panel">
      <div class="therm-panel-top">
        <span class="therm-ref">REPORT Nº ${ref ? escapeHtml(ref) : '—'}</span>
        <span class="therm-pages">01 / 02</span>
      </div>
      <h1 class="therm-doc-title">${escapeHtml(premCoverDocTitle(input))}</h1>
      <p class="therm-accent-bar"></p>
      ${jobTitle(input, 'therm-job-title', 'h2')}
      ${excerpt ? `<p class="therm-excerpt" ${editTextAttrs('description')}>${escapeHtml(excerpt)}</p>` : `<p class="therm-excerpt preview-only-edit" ${editTextAttrs('description')}>Tap to add description</p>`}
      ${verified}
      <div class="therm-hero" data-preview-edit="cover">
        <p class="therm-hero-bar"></p>
        ${coverPhoto(input)}
      </div>
    </div>
  </section>`;

  const readings = premChecklist(input) || premWorkBullets(input);
  const body = `<section class="sheet-body premium-page template-thermal">
    <header class="prem-head therm-head">${premLogo(input, theme)}<span class="prem-head-name">${escapeHtml(input.business.name)}</span><span class="therm-head-ref">${ref ? `Ref ${escapeHtml(ref)}` : ''}</span></header>
    ${premSectionHead('01', 'System readings')}
    ${readings || '<p class="prem-muted">No readings recorded.</p>'}
    ${premSectionHead('02', 'Before &amp; after')}
    ${premPhotosBlock(input)}
    ${premSectionHead('03', 'Work &amp; safety')}
    ${premWorkSafetyCols(input)}
    ${premAftercare(input)}
    ${premPricing(input, theme)}
    ${(() => {
      const dark = premDarkSignoff(input, '#C8773E');
      return dark || `${premSignatureStrip(input)}${premReviewStrip(input, '#C8773E')}`;
    })()}
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

function circuitMeta(input: ReportHtmlInput): string {
  return premMetaCols([
    {
      label: 'Client',
      html: isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—',
    },
    { label: 'Install date', html: escapeHtml(formatDate(input.job.jobDate)) },
    { label: 'Electrician', html: escapeHtml(preparedBy(input)) },
    {
      label: 'Certificates',
      html: refLine(input) ? escapeHtml(refLine(input)) : 'On file',
    },
  ]);
}

function renderCircuit(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const cover = `<section class="sheet-cover premium-cover template-circuit-cover">
    <div class="prem-grid-bg" aria-hidden="true"></div>
    <div class="circ-cover-head">
      ${premLogo(input, theme)}
      <p class="circ-biz">${escapeHtml(input.business.name)}</p>
    </div>
    ${jobTitle(input, 'circ-title')}
    ${jobAddress(input, 'circ-addr', `<span class="circ-addr-icon">${SVG_PIN}</span>`)}
    <div class="circ-meta-card">${circuitMeta(input)}</div>
    <div class="circ-hero-wrap" data-preview-edit="cover">
      <div class="circ-amber-bar"></div>
      ${coverPhoto(input, 'circ-hero-photo')}
    </div>
    <footer class="circ-cover-foot">
      <span>${ref ? escapeHtml(ref) : 'CIRCUIT REPORT'}</span>
      <span>${escapeHtml(formatDate(input.job.jobDate))}</span>
      <span class="prem-mono">01 / 02</span>
    </footer>
  </section>`;

  const body = `<section class="sheet-body premium-page template-circuit">
    <div class="circ-yellow-rule"></div>
    <header class="prem-head circ-head">${premLogo(input, theme)}<span class="prem-mono">CIRCUIT TEST SUMMARY</span></header>
    ${premCircuitPassTable(input)}
    <h2 class="prem-section-title">Site evidence</h2>
    ${premPhotosNumbered(input) || premPhotosBlock(input, 'stack')}
    <div class="circ-split">
      <div><h2 class="prem-section-title">Work summary</h2>${premWorkBullets(input) || '<p class="prem-muted">—</p>'}</div>
      <div><h2 class="prem-section-title">Materials &amp; cost</h2>${premMaterialsList(input)}${premPricing(input, theme)}</div>
    </div>
    ${premSignatureStrip(input)}
    ${premReviewStrip(input, '#F5A623')}
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

function studioLinenMeta(input: ReportHtmlInput): string {
  return premMetaCols([
    {
      label: 'Client',
      html: isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—',
    },
    {
      label: 'Property',
      html: isNonEmpty(input.job.address) ? rich(input.job.address) : '—',
    },
    { label: 'Handover', html: escapeHtml(formatDate(input.job.jobDate)) },
    { label: 'Lead', html: escapeHtml(preparedBy(input)) },
  ]);
}

function renderStudio(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const hero = input.after[0] ?? input.before[0];
  const caption = hero?.caption?.trim() || input.job.title;
  const cover = `<section class="sheet-cover premium-cover template-studio-cover">
    <header class="stu-cover-head">
      <span class="stu-biz">${escapeHtml(input.business.name)}</span>
      <span class="stu-tag">${escapeHtml(businessTagline(input, 'Fine kitchens &amp; joinery'))}</span>
    </header>
    <div class="stu-hero" data-preview-edit="cover">${coverPhoto(input)}</div>
    <p class="stu-caption"><em>${escapeHtml(caption)}</em></p>
    <p class="stu-handover">HANDOVER REPORT${ref ? ` · ${escapeHtml(ref)}` : ''}</p>
    ${jobTitle(input, 'stu-title')}
    <p class="stu-hairline"></p>
    <div class="stu-linen-band">${studioLinenMeta(input)}</div>
    <footer class="stu-cover-foot">
      <span>${isNonEmpty(input.business.phone) ? escapeHtml(input.business.phone.trim()) : ''}${isNonEmpty(input.business.email) ? ` · ${escapeHtml(input.business.email.trim())}` : ''}</span>
      <span class="prem-mono">01 / 02</span>
    </footer>
  </section>`;

  const body = `<section class="sheet-body premium-page template-studio">
    <header class="prem-head editorial">${premLogo(input, theme)}<span>${escapeHtml(input.business.name)}</span></header>
    <h2 class="prem-section-title serif">I. Room-by-room before &amp; after</h2>
    ${premPhotosBlock(input)}
    <h2 class="prem-section-title serif">II. Craftsmanship &amp; aftercare</h2>
    <div class="stu-craft-split">
      <div class="stu-table-block"><h3 class="prem-col-head">Materials</h3>${premMaterialsList(input) || '<p class="prem-muted">—</p>'}</div>
      <div class="stu-sage-box">${premAftercare(input) || '<p>Care instructions provided on handover.</p>'}</div>
    </div>
    <h2 class="prem-section-title serif">III. Handover checklist</h2>
    ${premHandoverChecklist(input) || premChecklist(input) || '<p class="prem-muted">—</p>'}
    ${premPricing(input, theme)}
    <div class="stu-sign-card">${premSignatureStrip(input)}${premReviewStrip(input, '#4E6B58')}</div>
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

function renderField(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const cover = `<section class="sheet-cover premium-cover template-field-cover">
    <div class="fld-slate-band" aria-hidden="true"></div>
    <header class="fld-cover-head">
      ${premLogo(input, theme)}
      <span class="fld-biz">${escapeHtml(input.business.name)}</span>
    </header>
    <span class="fld-proof-badge">EXTERIOR PROOF OF WORK</span>
    ${jobTitle(input, 'fld-title')}
    <p class="fld-strip">
      <span class="fld-strip-item">${SVG_CAL} ${escapeHtml(formatDate(input.job.jobDate))}</span>
      ${
        isNonEmpty(input.job.address)
          ? `<span class="fld-strip-item">${SVG_PIN} ${escapeHtml(input.job.address.trim().split('\n')[0] ?? '')}</span>`
          : ''
      }
    </p>
    <div class="fld-hero-wrap" data-preview-edit="cover">
      ${coverPhoto(input, 'fld-hero')}
      ${
        isNonEmpty(input.job.address)
          ? `<span class="fld-gps-badge">${SVG_ROOF} ${escapeHtml(input.job.address.trim().split('\n')[0] ?? '')}</span>`
          : ''
      }
    </div>
    <div class="fld-meta-light">
      ${premMetaCols([
        {
          label: 'Client',
          html: isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—',
        },
        { label: 'Date', html: escapeHtml(formatDate(input.job.jobDate)) },
        { label: 'Contractor', html: escapeHtml(preparedBy(input)) },
        { label: 'Ref', html: ref ? escapeHtml(ref) : '—' },
      ])}
    </div>
    <footer class="fld-cover-foot">
      <span>${escapeHtml(input.business.name)}</span>
      <span class="prem-mono">01 / 02</span>
    </footer>
  </section>`;

  const heroStack = premPhotosBlock(input) || premPhotosNumbered(input, 2);
  const body = `<section class="sheet-body premium-page template-field">
    <header class="prem-head">${premLogo(input, theme)}<span class="prem-guarantee">Site guarantee</span></header>
    ${premSectionHead('01', 'Annotated evidence')}
    ${heroStack}
    ${premSectionHead('02', 'Scope of works')}
    ${premScopeCards(input)}
    ${premWorkBullets(input)}
    ${premSectionHead('03', 'Guarantee certificate')}
    <div class="fld-cert-box">
      <p class="fld-cert-title">Workmanship guarantee</p>
      ${premAftercare(input) || '<p>This installation is covered under our standard workmanship guarantee. Retain this report for warranty validation.</p>'}
    </div>
    ${premMaterialsList(input)}
    ${premPricing(input, theme)}
    <div class="fld-sign-strip">${premSignatureStrip(input)}${premReviewStrip(input, '#C7593A')}</div>
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

function renderAtelier(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const cover = `<section class="sheet-cover premium-cover template-atelier-cover">
    <div class="atl-page-border" aria-hidden="true"></div>
    <p class="atl-biz-center">${escapeHtml(input.business.name)}</p>
    <p class="atl-terracotta">${escapeHtml(businessTagline(input, 'Colour · finish · detail'))}</p>
    <span class="atl-diamond">${SVG_DIAMOND}</span>
    <div class="atl-framed-photo">
      <div class="atl-frame-outer"><div class="atl-frame-inner" data-preview-edit="cover">${coverPhoto(input)}</div></div>
    </div>
    ${jobTitle(input, 'atl-title')}
    <span class="atl-diamond atl-diamond-b">${SVG_DIAMOND}</span>
    ${premMetaCols([
      {
        label: 'Client',
        html: isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—',
      },
      {
        label: 'Property',
        html: isNonEmpty(input.job.address) ? rich(input.job.address) : '—',
      },
      { label: 'Date', html: escapeHtml(formatDate(input.job.jobDate)) },
    ])}
    <footer class="atl-record">Record Nº ${ref ? escapeHtml(ref) : '—'}</footer>
  </section>`;

  const body = `<section class="sheet-body premium-page template-atelier">
    <header class="prem-head">${premLogo(input, theme)}<span>${escapeHtml(preparedBy(input))}</span></header>
    <h2 class="prem-section-title atl-serif">Colour &amp; finish palette</h2>
    ${atelierSwatches(input, theme)}
    <h2 class="prem-section-title atl-serif">Room gallery</h2>
    ${premPhotosBlock(input)}
    <h2 class="prem-section-title atl-serif">Prep &amp; coats</h2>
    <div class="atl-prep-table">${premMaterialsList(input)}${premWorkBullets(input)}</div>
    ${premPricing(input, theme)}
    <div class="atl-soft-sign">${premSignatureStrip(input)}${premReviewStrip(input, '#B56B53')}</div>
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

function renderBotanical(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const titleParts = input.job.title.trim().split(/\s+/);
  const titleMain = titleParts.length > 1 ? titleParts.slice(0, -1).join(' ') : input.job.title;
  const titleTail = titleParts.length > 1 ? (titleParts[titleParts.length - 1] ?? '') : '& Handover';
  const hero = input.after[0] ?? input.before[0];
  const caption = hero?.caption?.trim() || 'Transformation complete';
  const cover = `<section class="sheet-cover premium-cover template-botanical-cover">
    <header class="bot-cover-head">
      <span class="bot-emblem">${SVG_LEAF}</span>
      <span class="bot-biz">${escapeHtml(input.business.name)}</span>
    </header>
    <p class="bot-handover-num">Handover Nº ${ref ? escapeHtml(ref) : '—'}</p>
    <h1 class="bot-title" ${editTextAttrs('title')}>${escapeHtml(titleMain)} <em class="bot-title-tail">${escapeHtml(titleTail)}</em></h1>
    <div class="bot-meta-bordered">
      ${premMetaCols([
        {
          label: 'Client',
          html: isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—',
        },
        {
          label: 'Site',
          html: isNonEmpty(input.job.address) ? rich(input.job.address) : '—',
        },
        { label: 'Completed', html: escapeHtml(formatDate(input.job.jobDate)) },
        { label: 'Lead', html: escapeHtml(preparedBy(input)) },
      ])}
    </div>
    <div class="bot-hero-full" data-preview-edit="cover">${coverPhoto(input)}</div>
    <div class="bot-moss-strip">
      <p class="bot-moss-caption"><em>${escapeHtml(caption)}</em></p>
      <span class="bot-pages">01 / 02</span>
    </div>
  </section>`;

  const body = `<section class="sheet-body premium-page template-botanical">
    <header class="prem-head">${premLogo(input, theme)}<span>${escapeHtml(input.business.name)}</span></header>
    <h2 class="prem-section-title">Transformation gallery</h2>
    ${premGalleryGrid(input)}
    <div class="bot-cards-row">
      <div class="bot-notes-card"><h3 class="prem-col-head">Build notes</h3>${premWorkBullets(input) || premMaterialsList(input) || '<p class="prem-muted">—</p>'}</div>
      <div class="bot-sage-card"><h3 class="prem-col-head">Seasonal aftercare</h3>${premAftercare(input) || '<p>Maintain watering and seasonal pruning as agreed on site.</p>'}</div>
    </div>
    ${premChecklist(input)}
    ${premPricing(input, theme)}
    <div class="bot-moss-sign">${premSignatureStrip(input)}${premReviewStrip(input, '#7D9468')}</div>
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

function splitLabelValue(text: string): { label: string; value: string } {
  const idx = text.indexOf(':');
  if (idx > 0) {
    return { label: text.slice(0, idx).trim(), value: text.slice(idx + 1).trim() };
  }
  return { label: text, value: '—' };
}

function checklistProgress(input: ReportHtmlInput): { checked: number; total: number } {
  const items = input.checklist ?? [];
  const total = items.length > 0 ? items.length : 1;
  const checked = items.filter((item) => item.checked).length;
  return { checked, total };
}

function kpiValueFromLabel(label: string): string {
  const parsed = splitLabelValue(label);
  if (parsed.value !== '—') return parsed.value;
  const match = label.match(/\d[\d.,%kKwW]*/);
  if (match) return match[0]!;
  return label.trim().split(/\s+/)[0] ?? label;
}

function kpiLines(input: ReportHtmlInput, max: number): string[] {
  const fromChecklist = (input.checklist ?? []).map((item) => item.label);
  const fromMaterials = listItems(input.materials) ?? [];
  return [...fromChecklist, ...fromMaterials].filter(Boolean).slice(0, max);
}

function stoneMeta(input: ReportHtmlInput): string {
  return premMetaCols([
    {
      label: 'Client',
      html: isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—',
    },
    {
      label: 'Property',
      html: isNonEmpty(input.job.address) ? rich(input.job.address) : '—',
    },
    { label: 'Completed', html: escapeHtml(formatDate(input.job.jobDate)) },
    { label: 'Installer', html: escapeHtml(preparedBy(input)) },
  ]);
}

function stoneVerifyCards(input: ReportHtmlInput): string {
  const items = (input.checklist ?? []).slice(0, 3);
  if (items.length === 0) return premChecklist(input) || '<p class="prem-muted">No verification items recorded.</p>';
  return `<div class="sto-verify-cards">${items
    .map((item) => {
      const parsed = splitLabelValue(item.label);
      const value = parsed.value !== '—' ? parsed.value : item.checked ? 'Verified' : 'Pending';
      return `<div class="sto-verify-card${item.checked ? ' is-pass' : ''}"><span class="sto-verify-k">${escapeHtml(parsed.label)}</span><span class="sto-verify-v">${item.checked ? SVG_TICK : ''}${escapeHtml(value)}</span></div>`;
    })
    .join('')}</div>`;
}

function stoneMaterialsRows(input: ReportHtmlInput): string {
  const items = listItems(input.materials);
  if (!items) return '';
  return `<div class="sto-spec-rows">${items
    .map((line) => {
      const { label, value } = splitLabelValue(line);
      return `<div class="sto-spec-row"><span class="sto-spec-k">${escapeHtml(label)}</span><span class="sto-spec-v">${escapeHtml(value)}</span></div>`;
    })
    .join('')}</div>`;
}

function solarisKpiPills(input: ReportHtmlInput): string {
  const lines = kpiLines(input, 3);
  if (lines.length === 0) return '';
  return `<div class="sol-kpi-strip">${lines
    .map((line) => {
      const { label } = splitLabelValue(line);
      const value = kpiValueFromLabel(line);
      return `<div class="sol-kpi-pill"><span class="sol-kpi-v">${escapeHtml(value)}</span><span class="sol-kpi-k">${escapeHtml(label)}</span></div>`;
    })
    .join('')}</div>`;
}

function solarisYieldGrid(input: ReportHtmlInput): string {
  const lines = kpiLines(input, 4);
  if (lines.length === 0) return premChecklist(input) || '<p class="prem-muted">—</p>';
  return `<div class="sol-yield-grid">${lines
    .map((line) => {
      const { label, value } = splitLabelValue(line);
      const display = value !== '—' ? value : kpiValueFromLabel(line);
      return `<div class="sol-yield-card"><span class="sol-yield-k">${escapeHtml(label)}</span><span class="sol-yield-v">${escapeHtml(display)}</span></div>`;
    })
    .join('')}</div>`;
}

function solarisCommissionRows(input: ReportHtmlInput): string {
  const items = input.checklist ?? [];
  if (items.length === 0) return '<p class="prem-muted">No commissioning checks recorded.</p>';
  return `<div class="sol-commission">${items
    .map(
      (item) =>
        `<div class="sol-commission-row${item.checked ? ' is-verified' : ''}"><span>${escapeHtml(item.label)}</span>${item.checked ? '<span class="sol-verified-pill">VERIFIED</span>' : '<span class="sol-verified-pill is-open">—</span>'}</div>`
    )
    .join('')}</div>`;
}

function blueprintStageBar(input: ReportHtmlInput): string {
  const { checked, total } = checklistProgress(input);
  const slots = Math.max(total, 4);
  const segments = Array.from({ length: slots }, (_, i) =>
    i < total ? `<span class="bpt-stage-seg${i < checked ? ' is-done' : ''}"></span>` : '<span class="bpt-stage-seg is-empty"></span>'
  ).join('');
  return `<div class="bpt-stage"><span class="bpt-stage-label">Stage ${checked} of ${total}</span><div class="bpt-stage-bar">${segments}</div></div>`;
}

function blueprintTitleBlock(input: ReportHtmlInput, ref: string): string {
  const status = checklistAllPassed(input) ? 'Complete' : 'In progress';
  return `<div class="bpt-title-block">${premMetaCols([
    { label: 'Job ref', html: ref ? escapeHtml(ref) : '—' },
    { label: 'Building control', html: escapeHtml(status) },
    { label: 'Lead builder', html: escapeHtml(preparedBy(input)) },
    {
      label: 'Client',
      html: isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—',
    },
    { label: 'Report date', html: escapeHtml(formatDate(input.job.jobDate)) },
    { label: 'Sheet', html: '01 / 02' },
  ])}</div>`;
}

function clearlineSpecCards(input: ReportHtmlInput): string {
  const items = (listItems(input.materials) ?? []).slice(0, 4);
  if (items.length === 0) return premMaterialsList(input) || '<p class="prem-muted">—</p>';
  return `<div class="clr-spec-grid">${items
    .map((line) => {
      const { label, value } = splitLabelValue(line);
      return `<div class="clr-spec-card"><span class="clr-spec-k">${escapeHtml(label)}</span><span class="clr-spec-v">${escapeHtml(value)}</span></div>`;
    })
    .join('')}</div>`;
}

function clearlineChecklist(input: ReportHtmlInput): string {
  const items = input.checklist ?? [];
  if (items.length === 0) return premChecklist(input) || '<p class="prem-muted">—</p>';
  return `<div class="clr-checklist">${items
    .map(
      (item) =>
        `<div class="clr-check-row${item.checked ? ' is-done' : ''}"><span>${escapeHtml(item.label)}</span>${item.checked ? '<span class="clr-verified-pill">VERIFIED</span>' : '<span class="clr-verified-pill is-open">—</span>'}</div>`
    )
    .join('')}</div>`;
}

function renderStone(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const cover = `<section class="sheet-cover premium-cover template-stone-cover">
    <div class="sto-frame" aria-hidden="true"></div>
  <div class="sto-cover-inner">
    <div class="sto-logo-center">${premLogo(input, theme)}</div>
    <p class="sto-biz">${escapeHtml(input.business.name)}</p>
    <p class="sto-tag">${escapeHtml(businessTagline(input, 'Bathrooms · tiling · wet rooms'))}</p>
    <div class="sto-hero" data-preview-edit="cover">${coverPhoto(input)}</div>
    <p class="sto-handover">${ref ? `Handover ${escapeHtml(ref)} · ` : ''}<span class="sto-handover-doc">Installation record</span></p>
    ${jobTitle(input, 'sto-title')}
    ${jobAddress(input, 'sto-addr')}
    <div class="sto-meta-band">${stoneMeta(input)}</div>
    <footer class="sto-cover-foot">
      <span>${isNonEmpty(input.business.phone) ? escapeHtml(input.business.phone.trim()) : ''}${isNonEmpty(input.business.email) ? ` · ${escapeHtml(input.business.email.trim())}` : ''}</span>
      <span class="prem-mono">01 / 02</span>
    </footer>
  </div>
  </section>`;

  const body = `<section class="sheet-body premium-page template-stone">
    <header class="prem-head sto-head">${premLogo(input, theme)}<span class="prem-head-name">${escapeHtml(input.business.name)}</span>${ref ? `<span class="sto-head-ref">Ref ${escapeHtml(ref)}</span>` : ''}</header>
    ${premSectionHead('01', 'Verification')}
    ${stoneVerifyCards(input)}
    ${premSectionHead('02', 'Before &amp; after')}
    ${premPhotosBlock(input)}
    ${premSectionHead('03', 'Materials &amp; aftercare')}
    ${stoneMaterialsRows(input) || premMaterialsList(input) || '<p class="prem-muted">—</p>'}
    <div class="sto-aftercare">${premAftercare(input) || '<p>Care guidance provided on completion.</p>'}</div>
    ${premPricing(input, theme)}
    <div class="sto-sign-card">${premSignatureStrip(input)}${premReviewStrip(input, '#8A7F72')}</div>
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

function renderSolaris(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const inset = input.after[1] ?? input.before[1];
  const insetHtml = inset ? `<div class="sol-inset-card">${premShot(inset, 'Detail', true)}</div>` : '';
  const cover = `<section class="sheet-cover premium-cover template-solaris-cover">
    <header class="sol-cover-head">
      <span class="sol-emblem">${SVG_SUN}</span>
      ${premLogo(input, theme)}
      <div class="sol-cover-brand">
        <p class="sol-biz">${escapeHtml(input.business.name)}</p>
        <p class="sol-tag">${escapeHtml(businessTagline(input, 'ENERGY UK · Solar · Storage'))}</p>
      </div>
    </header>
    <span class="sol-report-pill">COMMISSIONING REPORT</span>
    ${jobTitle(input, 'sol-title')}
    ${jobAddress(input, 'sol-addr', `${SVG_PIN} `)}
    ${solarisKpiPills(input)}
    <div class="sol-hero-wrap" data-preview-edit="cover">
      ${coverPhoto(input, 'sol-hero-photo')}
      ${insetHtml}
    </div>
    <footer class="sol-cover-foot">
      ${premMetaCols([
        {
          label: 'Client',
          html: isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—',
        },
        {
          label: 'Property',
          html: isNonEmpty(input.job.address) ? rich(input.job.address) : '—',
        },
        { label: 'Installer', html: escapeHtml(preparedBy(input)) },
        { label: 'Ref', html: ref ? escapeHtml(ref) : '—' },
      ])}
    </footer>
  </section>`;

  const body = `<section class="sheet-body premium-page template-solaris">
    <header class="prem-head sol-head">${premLogo(input, theme)}<span>${escapeHtml(input.business.name)}</span><span class="prem-mono">Commissioning</span></header>
    ${premSectionHead('01', 'Projected yield')}
    ${solarisYieldGrid(input)}
    ${premSectionHead('02', 'Installation photos')}
    ${premPhotosBlock(input)}
    ${premSectionHead('03', 'Commissioning checklist')}
    ${solarisCommissionRows(input)}
    ${premMaterialsList(input)}
    ${premPricing(input, theme)}
    ${(() => {
      const dark = premDarkSignoff(input, '#16A35F');
      return dark ? `<div class="sol-signoff">${dark}</div>` : `${premSignatureStrip(input)}${premReviewStrip(input, '#16A35F')}`;
    })()}
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

function renderBlueprint(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const cover = `<section class="sheet-cover premium-cover template-blueprint-cover">
    <div class="bpt-grid-bg" aria-hidden="true"></div>
    <div class="bpt-crop tl" aria-hidden="true"></div>
    <div class="bpt-crop tr" aria-hidden="true"></div>
    <div class="bpt-crop bl" aria-hidden="true"></div>
    <div class="bpt-crop br" aria-hidden="true"></div>
    <div class="bpt-cover-inner">
      <header class="bpt-cover-head">${premLogo(input, theme)}<span class="bpt-biz">${escapeHtml(input.business.name)}</span></header>
      <span class="bpt-phase-pill">PHASE · SITE CLOSE-OUT</span>
      ${jobAddress(input, 'bpt-addr')}
      ${jobTitle(input, 'bpt-title')}
      ${blueprintStageBar(input)}
      <div class="bpt-dimension" aria-hidden="true"><span class="bpt-dim-line"></span><span class="bpt-dim-tick"></span></div>
      <div class="bpt-hero" data-preview-edit="cover">${coverPhoto(input)}</div>
      ${blueprintTitleBlock(input, ref)}
    </div>
  </section>`;

  const body = `<section class="sheet-body premium-page template-blueprint">
    <header class="prem-head bpt-head">${premLogo(input, theme)}<span class="prem-mono">Milestones</span></header>
    <h2 class="prem-section-title">Stage progress</h2>
    ${blueprintStageBar(input)}
    <h2 class="prem-section-title">Progress photos</h2>
    ${premGalleryGrid(input) || premPhotosBlock(input)}
    <h2 class="prem-section-title">Work completed</h2>
    ${premWorkBullets(input) || '<p class="prem-muted">—</p>'}
    ${premPricing(input, theme)}
    <div class="bpt-sign-strip">${premSignatureStrip(input)}${premReviewStrip(input, '#E0A222')}</div>
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

function renderClearline(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const cover = `<section class="sheet-cover premium-cover template-clearline-cover">
    <div class="clr-cover-split">
      <div class="clr-cover-copy">
        ${premLogo(input, theme)}
        <p class="clr-eyebrow">INSTALLATION RECORD</p>
        ${jobTitle(input, 'clr-title')}
        ${jobAddress(input, 'clr-addr')}
        <div class="clr-cover-meta">${premMetaCols([
          {
            label: 'Client',
            html: isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—',
          },
          { label: 'Completed', html: escapeHtml(formatDate(input.job.jobDate)) },
          { label: 'Installer', html: escapeHtml(preparedBy(input)) },
          { label: 'Ref', html: ref ? escapeHtml(ref) : '—' },
        ])}</div>
        <p class="clr-biz">${escapeHtml(input.business.name)}</p>
        <span class="prem-mono clr-pages">01 / 02</span>
      </div>
      <div class="clr-cover-photo" data-preview-edit="cover">${coverPhoto(input, 'clr-hero-photo')}</div>
    </div>
  </section>`;

  const body = `<section class="sheet-body premium-page template-clearline">
    <header class="prem-head clr-head">${premLogo(input, theme)}<span>${escapeHtml(input.business.name)}</span></header>
    ${premSectionHead('01', 'System specification')}
    ${clearlineSpecCards(input)}
    ${premSectionHead('02', 'Before &amp; after')}
    ${premPhotosBlock(input)}
    ${premSectionHead('03', 'Installation checklist')}
    ${clearlineChecklist(input)}
    <div class="clr-guarantee-band">
      <h3 class="clr-guarantee-title">Guarantee &amp; aftercare</h3>
      ${premAftercare(input) || '<p>Manufacturer warranty and glazing care guidance supplied on completion.</p>'}
    </div>
    ${premPricing(input, theme)}
    <div class="clr-sign-card">${premSignatureStrip(input)}${premReviewStrip(input, '#2E7AB8')}</div>
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

type SentinelZone = { zone: string; location: string; device: string; serial: string; status: string };

function parseSentinelZones(input: ReportHtmlInput): SentinelZone[] {
  const lines = (listItems(input.materials) ?? []).filter((line) => line.includes('·'));
  const zones = lines
    .map((line) => {
      const parts = line.split('·').map((part) => part.trim()).filter(Boolean);
      if (parts.length < 3) return null;
      const zone = parts[0]!;
      if (!/^(CH|DR|KP|ZN)[- ]?\d+/i.test(zone)) return null;
      return {
        zone,
        location: parts[1] ?? '—',
        device: parts[2] ?? '—',
        serial: parts[3] ?? '—',
        status: /DR|KP/i.test(zone) ? (/KP/i.test(zone) ? 'PAIRED' : 'FITTED') : 'ACTIVE',
      };
    })
    .filter((row): row is SentinelZone => row !== null);
  if (zones.length > 0) return zones.slice(0, 6);
  const fallback = (input.checklist ?? []).slice(0, 4);
  return fallback.map((item, i) => ({
    zone: `ZN-${String(i + 1).padStart(2, '0')}`,
    location: item.label,
    device: 'Device',
    serial: '—',
    status: item.checked ? 'ACTIVE' : 'OPEN',
  }));
}

function sentinelCoverMeta(input: ReportHtmlInput, ref: string): string {
  const materialLines = listItems(input.materials) ?? [];
  const recorder =
    materialLines.find((line) => /^recorder\s*:/i.test(line))?.replace(/^recorder\s*:/i, '').trim() ||
    '4-ch 4K NVR';
  const retention =
    materialLines.find((line) => /^retention\s*:/i.test(line))?.replace(/^retention\s*:/i, '').trim() ||
    '30 days · local only';
  const certificate =
    materialLines.find((line) => /^certificate\s*:/i.test(line))?.replace(/^certificate\s*:/i, '').trim() ||
    (ref ? `CERT-${ref}` : '—');
  return `<div class="sen-meta-grid">
    <div class="sen-meta-cell"><span class="sen-meta-k">Client</span><span class="sen-meta-v">${
      isNonEmpty(input.job.customerName) ? escapeHtml(input.job.customerName.trim()) : '—'
    }</span></div>
    <div class="sen-meta-cell"><span class="sen-meta-k">Installed</span><span class="sen-meta-v">${escapeHtml(
      formatDate(input.job.jobDate)
    )}</span></div>
    <div class="sen-meta-cell"><span class="sen-meta-k">Engineer</span><span class="sen-meta-v">${escapeHtml(
      preparedBy(input)
    )}</span></div>
    <div class="sen-meta-cell"><span class="sen-meta-k">Recorder</span><span class="sen-meta-v">${escapeHtml(
      recorder
    )}</span></div>
    <div class="sen-meta-cell"><span class="sen-meta-k">Retention</span><span class="sen-meta-v">${escapeHtml(
      retention
    )}</span></div>
    <div class="sen-meta-cell"><span class="sen-meta-k">Certificate</span><span class="sen-meta-v">${escapeHtml(
      certificate
    )}</span></div>
  </div>`;
}

function sentinelZoneTable(input: ReportHtmlInput): string {
  const zones = parseSentinelZones(input);
  if (zones.length === 0) return '<p class="prem-muted">No zones recorded.</p>';
  const online = zones.filter((z) => z.status !== 'OPEN').length;
  const rows = zones
    .map(
      (z, i) =>
        `<div class="sen-zone-row${i % 2 ? ' is-alt' : ''}"><span class="sen-zone-id">${escapeHtml(
          z.zone
        )}</span><span class="sen-zone-loc">${escapeHtml(z.location)}</span><span class="sen-zone-dev">${escapeHtml(
          z.device
        )}</span><span class="sen-zone-sn">${escapeHtml(z.serial)}</span><span class="sen-zone-status">${escapeHtml(
          z.status
        )}</span></div>`
    )
    .join('');
  return `<div class="sen-zone-block">
    <div class="sen-zone-head-row"><span class="prem-sec-num">01</span><h2 class="prem-section-title">Zones &amp; devices</h2><span class="prem-mono sen-online">${online} / ${zones.length} ONLINE</span></div>
    <div class="sen-zone-table">
      <div class="sen-zone-header"><span>ZONE</span><span>Location</span><span>Device</span><span>SERIAL</span><span>STATUS</span></div>
      ${rows}
    </div>
  </div>`;
}

function sentinelCameraViews(input: ReportHtmlInput): string {
  const photos = [...input.after, ...input.during, ...input.before];
  if (photos.length === 0) {
    return `<div class="sen-cam-block">
    <div class="sen-zone-head-row"><span class="prem-sec-num">02</span><h2 class="prem-section-title">Camera views &amp; hardware</h2></div>
    ${premPhotosBlock(input) || '<p class="prem-muted">No camera views recorded.</p>'}
  </div>`;
  }
  // Keep every photo in the HTML (layout tests assert data-photo-count and each id).
  if (photos.length > 3 || parseSentinelZones(input).length === 0) {
    return `<div class="sen-cam-block">
    <div class="sen-zone-head-row"><span class="prem-sec-num">02</span><h2 class="prem-section-title">Camera views &amp; hardware</h2></div>
    ${premPhotosBlock(input)}
  </div>`;
  }
  const zones = parseSentinelZones(input).slice(0, 3);
  const cards = zones
    .map((z, i) => {
      const photo = photos[i];
      const label = `${z.zone} · ${z.location}`;
      const hud = `<div class="sen-cam-hud"><span class="sen-rec">REC</span><span>${escapeHtml(
        `${z.zone} · ${z.location}`.toUpperCase()
      )}</span></div>`;
      const frame = photo
        ? `<div class="sen-cam-frame"><img class="sen-cam-photo" src="${photo.dataUri}" alt="" data-preview-edit="photo" data-photo-id="${escapeHtml(
            photo.id
          )}" />${hud}</div>`
        : `<div class="sen-cam-frame sen-cam-empty">${hud}</div>`;
      return `<figure class="sen-cam-card">${frame}<figcaption>${escapeHtml(label)}</figcaption></figure>`;
    })
    .join('');
  const count = input.before.length + input.during.length + input.after.length;
  return `<div class="sen-cam-block">
    <div class="sen-zone-head-row"><span class="prem-sec-num">02</span><h2 class="prem-section-title">Camera views &amp; hardware</h2></div>
    <div class="sen-cam-grid" data-photo-count="${count}">${cards}</div>
  </div>`;
}

function sentinelHandoverChecklist(input: ReportHtmlInput): string {
  const items = input.checklist ?? [];
  if (items.length === 0) return premChecklist(input) || '';
  const mid = Math.ceil(items.length / 2);
  const col = (slice: typeof items) =>
    slice
      .map(
        (item) =>
          `<div class="sen-check-row">${item.checked ? `<span class="sen-tick">${SVG_TICK}</span>` : '<span class="sen-tick is-open"></span>'}<span>${escapeHtml(
            item.label
          )}</span></div>`
      )
      .join('');
  return `<div class="sen-handover-block">
    <div class="sen-zone-head-row"><span class="prem-sec-num">03</span><h2 class="prem-section-title">Handover &amp; privacy checklist</h2></div>
    <div class="sen-check-cols"><div>${col(items.slice(0, mid))}</div><div>${col(items.slice(mid))}</div></div>
  </div>`;
}

function renderSentinel(input: ReportHtmlInput, theme: PremiumTheme): string {
  const ref = refLine(input);
  const armed = checklistAllPassed(input);
  const cover = `<section class="sheet-cover premium-cover template-sentinel-cover">
    <header class="sen-cover-head">
      <span class="sen-aperture">${SVG_APERTURE}</span>
      <div class="sen-brand">
        <p class="sen-biz">${escapeHtml(input.business.name)}</p>
        <p class="sen-tag">${escapeHtml(businessTagline(input, 'SECURITY & ACCESS'))}</p>
      </div>
      <span class="prem-mono sen-ref">SECURITY HANDOVER${ref ? ` · REF ${escapeHtml(ref)}` : ''}</span>
    </header>
    <p class="sen-armed"><span class="sen-armed-dot"></span>${
      armed ? 'INSTALLATION COMPLETE · SYSTEM ARMED' : 'INSTALLATION IN PROGRESS'
    }</p>
    ${jobTitle(input, 'sen-title')}
    <p class="sen-sub">${
      isNonEmpty(input.job.description)
        ? rich(descriptionExcerpt(input, 140))
        : escapeHtml('4K PoE CCTV & access control')
    }${isNonEmpty(input.job.address) ? `  ·  ${rich(input.job.address)}` : ''}</p>
    <div class="sen-status-pill"><span class="sen-status-dot"></span>${
      armed ? 'Zones Active · Encrypted Local NVR' : 'Commissioning in progress'
    }</div>
    <div class="sen-hero" data-preview-edit="cover">
      ${coverPhoto(input, 'sen-hero-photo')}
      <div class="sen-hud-brackets" aria-hidden="true"></div>
      <div class="sen-hud-top"><span class="sen-rec">REC</span><span>CH-01 · FRONT ENTRY · 4K</span></div>
      <div class="sen-hud-time">${escapeHtml(formatDate(input.job.jobDate))}</div>
    </div>
    ${sentinelCoverMeta(input, ref)}
    <footer class="sen-cover-foot">
      <span class="prem-mono">${escapeHtml(
        [input.business.website, input.business.phone].filter(Boolean).join('  ·  ') || input.business.name
      )}</span>
      <span class="prem-mono">01 / 02</span>
    </footer>
  </section>`;

  const body = `<section class="sheet-body premium-page template-sentinel">
    <header class="sen-body-head">
      <span class="sen-aperture">${SVG_APERTURE}</span>
      <span class="sen-biz-sm">${escapeHtml(input.business.name)}</span>
      <span class="prem-mono">SECURITY HANDOVER${ref ? ` · ${escapeHtml(ref)}` : ''}</span>
      <span class="prem-mono sen-page">02 / 02</span>
    </header>
    ${sentinelZoneTable(input)}
    ${sentinelCameraViews(input)}
    ${sentinelHandoverChecklist(input)}
    <div class="sen-privacy">
      <span class="sen-privacy-bar" aria-hidden="true"></span>
      <span class="sen-lock">${SVG_LOCK}</span>
      <div class="sen-privacy-copy">
        <p class="sen-privacy-title">Your footage stays yours</p>
        <p class="sen-privacy-body">${
          isNonEmpty(input.recommendations)
            ? escapeHtml(input.recommendations.trim().split(/\n/)[0]!.slice(0, 160))
            : 'Recordings are encrypted at rest on the local NVR and never leave the property.'
        }</p>
      </div>
      <span class="prem-mono sen-aes">AES-256</span>
    </div>
    ${premPricing(input, theme)}
    ${(() => {
      const dark = premDarkSignoff(input, '#5FD3BE');
      return dark
        ? `<div class="sen-signoff">${dark}</div>`
        : `<div class="sen-signoff">${premSignatureStrip(input)}${premReviewStrip(input, '#12947F')}</div>`;
    })()}
    ${premFooter(input)}
  </section>`;

  return cover + body;
}

export function renderPremiumTemplate(
  template: ReportTemplateId,
  input: ReportHtmlInput,
  theme: PremiumTheme
): string {
  if (template === 'thermal') return renderThermal(input, theme);
  if (template === 'circuit') return renderCircuit(input, theme);
  if (template === 'studio') return renderStudio(input, theme);
  if (template === 'field') return renderField(input, theme);
  if (template === 'atelier') return renderAtelier(input, theme);
  if (template === 'botanical') return renderBotanical(input, theme);
  if (template === 'stone') return renderStone(input, theme);
  if (template === 'solaris') return renderSolaris(input, theme);
  if (template === 'blueprint') return renderBlueprint(input, theme);
  if (template === 'clearline') return renderClearline(input, theme);
  if (template === 'sentinel') return renderSentinel(input, theme);
  return renderThermal(input, theme);
}