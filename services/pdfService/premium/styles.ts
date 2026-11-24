import { ReportTemplateId } from '@/models';

import { cssColor } from './shared';

const PREMIUM_IDS = [
  'thermal',
  'circuit',
  'studio',
  'field',
  'atelier',
  'botanical',
  'stone',
  'solaris',
  'blueprint',
  'clearline',
  'sentinel',
] as const;

export function premiumFontLinks(template: ReportTemplateId): string {
  const families: Record<(typeof PREMIUM_IDS)[number], string> = {
    thermal:
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap',
    circuit:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap',
    studio:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
    field:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap',
    atelier:
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Instrument+Serif:ital@0;1&display=swap',
    botanical:
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap',
    stone:
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Outfit:wght@400;500;600;700&display=swap',
    solaris:
      'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap',
    blueprint:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap',
    clearline:
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Inter:wght@400;500;600;700&display=swap',
    sentinel:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
  };
  if (!(PREMIUM_IDS as readonly string[]).includes(template)) return '';
  const href = families[template as (typeof PREMIUM_IDS)[number]];
  return `<link rel="stylesheet" href="${href}" />`;
}

function fontStack(template: ReportTemplateId): string {
  switch (template) {
    case 'thermal':
      return "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
    case 'circuit':
    case 'field':
      return "'Space Grotesk', 'Inter', -apple-system, sans-serif";
    case 'studio':
      return "'DM Sans', -apple-system, sans-serif";
    case 'atelier':
      return "'DM Sans', -apple-system, sans-serif";
    case 'botanical':
      return "'Newsreader', 'DM Sans', Georgia, serif";
    case 'stone':
      return "'DM Sans', -apple-system, sans-serif";
    case 'solaris':
      return "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
    case 'blueprint':
      return "'Space Grotesk', 'Inter', -apple-system, sans-serif";
    case 'clearline':
      return "'Inter', 'DM Sans', -apple-system, sans-serif";
    case 'sentinel':
      return "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    default:
      return "-apple-system, BlinkMacSystemFont, sans-serif";
  }
}

function outfitStack(): string {
  return "'Outfit', -apple-system, sans-serif";
}

function cormorantStack(): string {
  return "'Cormorant Garamond', Georgia, serif";
}

function instrumentStack(): string {
  return "'Instrument Serif', Georgia, serif";
}

export function premiumStylesheet(template: ReportTemplateId, accentRgb: string): string {
  const accent = cssColor(accentRgb);
  const navy = cssColor('#132638');
  const circuitBg = cssColor('#1A1A1A');
  const circuitDeep = cssColor('#0B0B0B');
  const studioCream = cssColor('#F7F4EE');
  const studioInk = cssColor('#1E1C1A');
  const studioSage = cssColor('#4E6B58');
  const studioLinen = cssColor('#EFE9DF');
  const fieldSlate = cssColor('#1E2B37');
  const fieldWash = cssColor('#F6F5F2');
  const atelierCream = cssColor('#FAF8F4');
  const atelierForest = cssColor('#24362C');
  const botanicalCream = cssColor('#F3EFE7');
  const botanicalMoss = cssColor('#1B3126');
  const botanicalSage = cssColor('#7D9468');
  const botanicalWash = cssColor('#E3E8DA');
  const stoneInk = cssColor('#1C1F22');
  const stoneTaupe = cssColor('#8A7F72');
  const stoneWash = cssColor('#EFECE7');
  const solarisForest = cssColor('#0E2D21');
  const solarisGreen = cssColor('#16A35F');
  const solarisWash = cssColor('#ECF5F0');
  const blueprintNavy = cssColor('#14284B');
  const blueprintGold = cssColor('#E0A222');
  const blueprintWash = cssColor('#F4F6FA');
  const clearlineCharcoal = cssColor('#23272C');
  const clearlineBlue = cssColor('#2E7AB8');
  const clearlineWash = cssColor('#F1F5F9');
  const sentinelInk = cssColor('#111419');
  const sentinelTeal = cssColor('#12947F');
  const sentinelRed = cssColor('#D63B3B');
  const sentinelMint = cssColor('#5FD3BE');
  const sentinelWash = cssColor('#F3F4F6');
  const muted = cssColor('#8fa3b8');
  const ink = cssColor('#141816');
  const line = cssColor('#E4E7E4');
  const paper = cssColor('#FFFFFF');

  const coverBg =
    template === 'thermal'
      ? navy
      : template === 'circuit'
        ? circuitDeep
        : template === 'studio'
          ? studioCream
          : template === 'field'
            ? fieldSlate
            : template === 'atelier'
              ? atelierCream
              : template === 'botanical'
                ? botanicalCream
                : template === 'stone'
                  ? stoneWash
                  : template === 'solaris'
                    ? solarisForest
                    : template === 'blueprint'
                      ? blueprintNavy
                      : template === 'clearline'
                        ? clearlineWash
                        : template === 'sentinel'
                          ? sentinelInk
                          : navy;

  const bodyBg =
    template === 'studio'
      ? studioCream
      : template === 'field'
        ? fieldWash
        : template === 'atelier'
          ? atelierCream
          : template === 'botanical'
            ? botanicalCream
            : template === 'stone'
              ? paper
              : template === 'solaris'
                ? solarisWash
                : template === 'blueprint'
                  ? blueprintWash
                  : template === 'clearline'
                    ? clearlineWash
                    : paper;

  const bodyInk =
    template === 'studio'
      ? studioInk
      : template === 'atelier'
        ? atelierForest
        : template === 'botanical'
          ? botanicalMoss
          : template === 'stone'
            ? stoneInk
            : template === 'solaris'
              ? solarisForest
              : template === 'blueprint'
                ? blueprintNavy
                : template === 'clearline'
                  ? clearlineCharcoal
                  : template === 'sentinel'
                    ? sentinelInk
                    : ink;

  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html { background: ${paper}; }
  body {
    margin: 0 auto;
    max-width: 210mm;
    color: ${bodyInk};
    background: ${bodyBg};
    font-family: ${fontStack(template)};
    font-size: 10.5pt;
    line-height: 1.45;
  }
  .sheet-cover.premium-cover,
  .sheet-body.premium-page {
    width: 210mm;
    min-height: 297mm;
    box-sizing: border-box;
  }
  .sheet-cover.premium-cover {
    display: flex;
    flex-direction: column;
    background: ${coverBg};
    color: rgb(255, 255, 255);
    break-after: page;
    page-break-after: always;
    overflow: hidden;
    position: relative;
  }
  .sheet-body.premium-page {
    padding: 14mm 15mm 16mm;
    background: ${bodyBg};
    break-before: page;
    page-break-before: always;
  }
  h1, h2, h3 { margin: 0; page-break-after: avoid; font-weight: 700; }
  p { margin: 0; }
  img { max-width: 100%; display: block; }
  /* Cover heroes always fill their Figma frame; never letterbox or overflow. */
  .prem-cover-photo, .prem-cover-photo ~ img,
  .circ-hero-photo, .sol-hero-photo, .clr-hero-photo, .sen-hero-photo, .fld-hero {
    width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;
  }
  .preview-only-edit { display: none !important; }
  .prem-cover-eyebrow {
    display: block;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.85;
    margin-bottom: 3mm;
  }
  .prem-cover-sub { margin-top: 2mm; font-size: 10pt; opacity: 0.8; }
  .prem-cover-icon { color: ${accent}; }
  .prem-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 8.5pt; letter-spacing: 0.06em; }
  .prem-serif-lede { font-family: ${cormorantStack()}; font-size: 13pt; font-style: italic; margin-top: 2mm; color: ${studioInk}; }
  .prem-section-title {
    font-size: 12pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 5mm 0 3mm;
    color: ${bodyInk};
  }
  .prem-section-title.serif { font-family: ${cormorantStack()}; text-transform: none; font-size: 15pt; letter-spacing: 0; font-weight: 600; }
  .prem-section-title.atl-serif { font-family: ${instrumentStack()}; text-transform: none; font-size: 16pt; letter-spacing: 0.02em; font-weight: 400; }
  .prem-sec-num { font-size: 9pt; letter-spacing: 0.12em; opacity: 0.55; margin-right: 2mm; font-weight: 700; }
  .prem-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4mm;
    margin-bottom: 5mm;
    padding-bottom: 3mm;
    border-bottom: 0.4mm solid ${line};
  }
  .prem-head.dark { background: ${circuitBg}; color: rgb(255,255,255); margin: -14mm -15mm 6mm; padding: 8mm 15mm; border: none; }
  .prem-head.editorial { border-bottom-color: ${studioLinen}; }
  .prem-head-name { font-size: 9pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .prem-logo { width: 10mm; height: 10mm; border-radius: 2mm; object-fit: cover; flex-shrink: 0; }
  .prem-logo-fallback {
    display: flex; align-items: center; justify-content: center;
    font-size: 9pt; font-weight: 800;
  }
  .prem-meta { margin: 0 0 4mm; }
  .prem-meta-row { display: flex; gap: 4mm; padding: 2mm 0; border-bottom: 0.3mm solid ${line}; }
  .prem-meta-row dt { width: 28mm; flex-shrink: 0; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.65; }
  .prem-meta-row dd { margin: 0; font-weight: 600; flex: 1; min-width: 0; }
  .prem-readings { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5mm; margin-bottom: 4mm; }
  .prem-reading {
    border: 0.3mm solid ${line};
    border-radius: 2mm;
    padding: 2.5mm 3mm;
    display: flex;
    justify-content: space-between;
    gap: 2mm;
    align-items: center;
    background: rgb(255, 255, 255);
  }
  .prem-reading-label { font-size: 9pt; flex: 1; min-width: 0; }
  .prem-reading-value { font-size: 8.5pt; font-weight: 700; display: flex; align-items: center; gap: 1mm; color: ${muted}; }
  .prem-reading-value.is-pass { color: ${accent}; }
  .prem-photos { margin: 0 0 4mm; }
  .prem-area-title { font-size: 11pt; margin: 0 0 2mm; }
  .prem-pair { display: flex; gap: 3mm; margin-bottom: 3mm; break-inside: avoid; page-break-inside: avoid; }
  .prem-shot { flex: 1; margin: 0; min-width: 0; }
  .prem-shot-frame { position: relative; border-radius: 3mm; overflow: hidden; background: rgb(231,235,231); height: 52mm; }
  .prem-shot-frame .prem-photo,
  .prem-shot-frame .prem-photo-marks {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .prem-shot-frame .prem-photo-marks { max-width: none; max-height: none; margin: 0; }
  .prem-tag {
    position: absolute; left: 2mm; top: 2mm;
    background: rgb(255,255,255); font-size: 7pt; font-weight: 800;
    letter-spacing: 0.08em; text-transform: uppercase; padding: 0.6mm 2mm; border-radius: 999px;
  }
  .prem-shot figcaption { margin-top: 1.2mm; font-size: 8pt; color: ${muted}; }
  .prem-gap { flex: 1; }
  .prem-specs, .prem-work { margin: 0 0 4mm; padding-left: 5mm; }
  .prem-specs li, .prem-work li { margin: 0 0 1.2mm; }
  .prem-care {
    margin: 0 0 4mm; padding: 3mm; border-radius: 2mm;
    background: ${template === 'botanical' ? botanicalWash : template === 'studio' ? studioLinen : 'rgb(244,246,244)'};
    font-size: 9.5pt;
  }
  .prem-muted { color: ${muted}; font-size: 9pt; margin-bottom: 3mm; }
  .block.section-pricing { margin: 4mm 0; break-inside: avoid; }
  .prem-price-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .prem-price-table th, .prem-price-table td { padding: 1.8mm 2mm; border-bottom: 0.3mm solid ${line}; text-align: left; vertical-align: top; }
  .prem-price-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .prem-price-total td { font-weight: 700; font-size: 11pt; border-bottom: none; }
  .prem-doc-pill { font-size: 7pt; padding: 0.5mm 2mm; border-radius: 999px; vertical-align: middle; margin-left: 2mm; }
  .prem-sign { margin: 4mm 0; break-inside: avoid; }
  .prem-sign-pad { border: 0.3mm solid ${line}; border-radius: 2mm; padding: 2mm; background: rgb(255,255,255); }
  .prem-sign-pad svg { width: 60mm; height: auto; display: block; }
  .prem-sign-meta { display: flex; justify-content: space-between; margin-top: 2mm; font-size: 9pt; font-weight: 600; }
  .prem-review {
    display: flex; gap: 4mm; align-items: center; justify-content: space-between;
    margin: 5mm 0 3mm; padding: 3.5mm; border-radius: 2.5mm;
    border: 0.3mm solid ${line}; background: rgb(255,255,255);
    break-inside: avoid;
  }
  .prem-review-title { font-weight: 700; font-size: 11pt; margin: 0 0 1mm; }
  .prem-review-stars { margin: 1mm 0; }
  .prem-review-badge {
    display: inline-block; font-size: 7.5pt; font-weight: 700;
    padding: 0.6mm 2mm; border-radius: 999px; border: 0.3mm solid ${line};
  }
  .prem-review-link { display: block; margin-top: 1.5mm; font-size: 8.5pt; color: ${accent}; }
  .prem-meta-cols { display: flex; gap: 3mm; width: 100%; }
  .prem-meta-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1mm; }
  .prem-meta-col-label {
    font-size: 7pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.65;
  }
  .prem-meta-col-value { font-size: 9pt; font-weight: 600; line-height: 1.35; }
  .prem-two-col { display: flex; gap: 5mm; margin-bottom: 4mm; break-inside: avoid; }
  .prem-two-col > .prem-col-block { flex: 1; min-width: 0; }
  .prem-col-head { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 2mm; opacity: 0.75; }
  .prem-pass-pill {
    display: inline-block; padding: 0.5mm 2.5mm; border-radius: 999px; font-size: 7.5pt; font-weight: 800;
    background: ${accent}; color: rgb(20, 20, 20); letter-spacing: 0.06em;
  }
  .prem-pass-pill.is-open { background: rgb(235, 235, 235); color: ${muted}; font-weight: 600; }
  .prem-num-photos { display: flex; flex-direction: column; gap: 3mm; margin-bottom: 4mm; }
  .prem-num-shot { margin: 0; break-inside: avoid; }
  .prem-num-frame { position: relative; border-radius: 2mm; overflow: hidden; background: rgb(230, 230, 230); height: 48mm; }
  .prem-num-frame .prem-photo,
  .prem-num-frame .prem-photo-marks {
    width: 100%; height: 100%; object-fit: cover; display: block; max-width: none; max-height: none; margin: 0;
  }
  .prem-num-badge {
    position: absolute; left: 2mm; top: 2mm; font-family: 'JetBrains Mono', monospace; font-size: 8pt;
    background: rgb(0,0,0); color: rgb(255,255,255); padding: 0.8mm 2mm; border-radius: 1mm;
  }
  .prem-scope-cards { display: flex; gap: 3mm; margin-bottom: 4mm; }
  .prem-scope-card {
    flex: 1; min-width: 0; border: 0.3mm solid ${line}; border-radius: 2mm; padding: 3mm; background: rgb(255,255,255);
  }
  .prem-scope-num { font-size: 8pt; font-weight: 800; color: ${accent}; display: block; margin-bottom: 1.5mm; }
  .prem-handover-row { display: flex; flex-wrap: wrap; gap: 2mm; margin-bottom: 4mm; }
  .prem-handover-chip {
    display: inline-flex; align-items: center; gap: 1mm; font-size: 8.5pt; padding: 1mm 2.5mm;
    border: 0.3mm solid ${line}; border-radius: 999px; background: rgb(255,255,255);
  }
  .prem-handover-chip.is-done { border-color: ${accent}; }
  .prem-gallery-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5mm; margin-bottom: 4mm; }
  .prem-gallery-cell { margin: 0; min-width: 0; }
  .prem-gallery-cell .prem-shot-frame .prem-photo { height: 42mm; width: 100%; object-fit: cover; }
  .prem-signoff-dark, .fld-sign-strip, .bot-moss-sign, .sol-signoff, .bpt-sign-strip {
    margin: 5mm -15mm -16mm; padding: 5mm 15mm 6mm; background: ${navy}; color: rgb(255,255,255);
  }
  .fld-sign-strip { background: ${fieldSlate}; }
  .bot-moss-sign { background: ${botanicalMoss}; }
  .sol-signoff { background: ${solarisForest}; margin: 5mm -15mm -16mm; padding: 0; }
  .sol-signoff .prem-signoff-dark { margin: 0; background: transparent; }
  .bpt-sign-strip { background: ${blueprintNavy}; }
  .prem-signoff-dark .prem-review, .fld-sign-strip .prem-review, .bot-moss-sign .prem-review, .sol-signoff .prem-review, .bpt-sign-strip .prem-review {
    border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); color: rgb(255,255,255);
  }
  .prem-signoff-dark .prem-review-link, .fld-sign-strip .prem-review-link, .bot-moss-sign .prem-review-link, .sol-signoff .prem-review-link, .bpt-sign-strip .prem-review-link { color: rgb(255,255,255); }
  .prem-review-qr { text-align: center; flex-shrink: 0; font-size: 7pt; }
  .prem-review-qr img { width: 18mm; height: 18mm; border-radius: 1.5mm; border: 0.3mm solid ${line}; }
  .prem-foot { margin-top: 4mm; padding-top: 2mm; border-top: 0.3mm solid ${line}; font-size: 7.5pt; color: ${muted}; text-align: center; }
  .prem-photo-marks { display: block; }
  .prem-gallery-cell .prem-shot-frame { height: 42mm; }

  /* Thermal — spine + white panel cover */
  body[data-template="thermal"] .template-thermal-cover {
    flex-direction: row; padding: 0; align-items: stretch; color: rgb(255,255,255);
  }
  body[data-template="thermal"] .therm-spine {
    width: 74mm; flex-shrink: 0; background: ${navy}; position: relative; display: flex; flex-direction: column;
  }
  body[data-template="thermal"] .therm-spine-grid {
    position: absolute; inset: 0; opacity: 0.22; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.14) 0.35mm, transparent 0.35mm),
      linear-gradient(90deg, rgba(255,255,255,0.14) 0.35mm, transparent 0.35mm);
    background-size: 6mm 6mm;
  }
  body[data-template="thermal"] .therm-spine-inner {
    position: relative; z-index: 1; padding: 10mm 6mm 8mm; display: flex; flex-direction: column; gap: 2.5mm; flex: 1;
  }
  body[data-template="thermal"] .therm-biz { font-size: 8pt; font-weight: 800; letter-spacing: 0.14em; line-height: 1.3; }
  body[data-template="thermal"] .therm-tagline { font-size: 7pt; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.75; }
  body[data-template="thermal"] .therm-status { display: flex; align-items: center; gap: 1.5mm; font-size: 8.5pt; font-weight: 600; margin-top: 2mm; }
  body[data-template="thermal"] .therm-status-dot { width: 2mm; height: 2mm; border-radius: 50%; background: ${accent}; }
  body[data-template="thermal"] .therm-hairline { height: 0.35mm; background: ${accent}; margin: 2mm 0; opacity: 0.95; }
  body[data-template="thermal"] .therm-meta-row { display: flex; flex-direction: column; gap: 0.5mm; padding: 1.5mm 0; border-bottom: 0.25mm solid rgba(255,255,255,0.12); }
  body[data-template="thermal"] .therm-meta-k { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.55; }
  body[data-template="thermal"] .therm-meta-v { font-size: 8.5pt; font-weight: 600; line-height: 1.3; }
  body[data-template="thermal"] .therm-spine-foot { margin-top: auto; font-size: 7pt; opacity: 0.5; letter-spacing: 0.06em; padding-top: 4mm; }
  body[data-template="thermal"] .therm-panel {
    flex: 1; background: rgb(255,255,255); color: ${navy}; padding: 10mm 11mm 8mm;
    display: flex; flex-direction: column; min-width: 0;
  }
  body[data-template="thermal"] .therm-panel-top { display: flex; justify-content: space-between; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5mm; opacity: 0.7; }
  body[data-template="thermal"] .therm-doc-title { font-size: 13pt; font-weight: 800; letter-spacing: 0.08em; line-height: 1.15; }
  body[data-template="thermal"] .therm-accent-bar { height: 1mm; width: 14mm; background: ${accent}; margin: 3mm 0; }
  body[data-template="thermal"] .therm-job-title { font-size: 22pt; font-weight: 800; line-height: 1.05; color: ${navy}; }
  body[data-template="thermal"] .therm-excerpt { font-size: 9.5pt; line-height: 1.45; margin-top: 2mm; color: rgb(80, 90, 100); max-width: 95%; }
  body[data-template="thermal"] .therm-verified { display: inline-flex; align-items: center; gap: 1mm; font-size: 8pt; font-weight: 700; color: ${accent}; margin-top: 2mm; }
  /* Figma hero 385×512 on A4 ≈ fills remaining panel; image cover-crops to frame. */
  body[data-template="thermal"] .therm-hero {
    position: relative; margin: 4mm -11mm 0; margin-top: auto; flex: 1 1 auto;
    min-height: 120mm; overflow: hidden;
  }
  body[data-template="thermal"] .therm-hero-bar { position: absolute; left: 0; right: 0; top: 0; height: 1.2mm; background: ${accent}; z-index: 2; }
  body[data-template="thermal"] .therm-hero .prem-cover-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  body[data-template="thermal"] .therm-head-ref { margin-left: auto; font-size: 8.5pt; opacity: 0.6; }

  /* Circuit */
  body[data-template="circuit"] .template-circuit-cover {
    padding: 12mm 12mm 0; color: rgb(255,255,255); background: ${circuitDeep};
  }
  body[data-template="circuit"] .prem-grid-bg {
    position: absolute; inset: 0; opacity: 0.4;
    background-image:
      linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 7mm 7mm; pointer-events: none;
  }
  body[data-template="circuit"] .circ-cover-head { display: flex; align-items: center; gap: 3mm; position: relative; z-index: 1; margin-bottom: 6mm; }
  body[data-template="circuit"] .circ-biz { font-size: 9pt; font-weight: 600; opacity: 0.85; }
  body[data-template="circuit"] .circ-title { font-size: 28pt; line-height: 1.05; position: relative; z-index: 1; max-width: 165mm; }
  body[data-template="circuit"] .circ-addr { display: flex; align-items: flex-start; gap: 1.5mm; font-size: 9.5pt; opacity: 0.8; margin: 3mm 0 4mm; position: relative; z-index: 1; }
  body[data-template="circuit"] .circ-meta-card {
    position: relative; z-index: 1; background: rgb(255,255,255); color: ${ink}; border-radius: 2mm;
    padding: 4mm 5mm; margin-bottom: 5mm;
  }
  /* Figma hero 595×390 ≈ 138mm tall full-bleed band. */
  body[data-template="circuit"] .circ-hero-wrap {
    position: relative; z-index: 1; margin: 0 -12mm; flex: 1 1 auto;
    min-height: 120mm; height: 138mm; max-height: 148mm; overflow: hidden;
  }
  body[data-template="circuit"] .circ-amber-bar { position: absolute; left: 0; right: 0; top: 0; height: 1.2mm; background: rgb(245, 166, 35); z-index: 2; }
  body[data-template="circuit"] .circ-hero-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  body[data-template="circuit"] .circ-cover-foot {
    position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center;
    padding: 4mm 0 8mm; font-size: 8pt; opacity: 0.75; margin-top: auto;
  }
  body[data-template="circuit"] .circ-yellow-rule { height: 1mm; background: rgb(245, 166, 35); margin: -14mm -15mm 5mm; }
  body[data-template="circuit"] .circ-split { display: flex; gap: 5mm; margin-bottom: 4mm; }
  body[data-template="circuit"] .circ-split > div { flex: 1; min-width: 0; }
  body[data-template="circuit"] .prem-circuit-table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; font-size: 9pt; }
  body[data-template="circuit"] .prem-circuit-table th,
  body[data-template="circuit"] .prem-circuit-table td { padding: 2mm; border-bottom: 0.3mm solid ${line}; }
  body[data-template="circuit"] .template-circuit { background: rgb(250,250,250); color: ${ink}; }

  /* Studio */
  body[data-template="studio"] .sheet-cover.premium-cover { color: ${studioInk}; padding: 0; }
  body[data-template="studio"] .stu-cover-head {
    display: flex; justify-content: space-between; align-items: baseline; padding: 10mm 14mm 4mm; gap: 4mm;
  }
  body[data-template="studio"] .stu-biz { font-size: 9pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  body[data-template="studio"] .stu-tag { font-size: 8.5pt; font-style: italic; font-family: ${cormorantStack()}; opacity: 0.75; }
  /* Figma hero 515×456 ≈ 161mm. */
  body[data-template="studio"] .stu-hero { position: relative; margin: 0 14mm; height: 148mm; overflow: hidden; border-radius: 1.5mm; }
  body[data-template="studio"] .stu-hero .prem-cover-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  body[data-template="studio"] .stu-caption { padding: 3mm 14mm 0; font-family: ${cormorantStack()}; font-size: 11pt; opacity: 0.8; }
  body[data-template="studio"] .stu-handover { padding: 4mm 14mm 0; font-size: 8pt; font-weight: 700; letter-spacing: 0.12em; }
  body[data-template="studio"] .stu-title { padding: 2mm 14mm 0; font-family: ${cormorantStack()}; font-size: 32pt; font-weight: 600; line-height: 1.05; }
  body[data-template="studio"] .stu-hairline { height: 0.35mm; background: ${studioInk}; margin: 4mm 14mm; opacity: 0.25; }
  body[data-template="studio"] .stu-linen-band { background: ${studioLinen}; padding: 4mm 14mm; margin-top: auto; }
  body[data-template="studio"] .stu-cover-foot {
    display: flex; justify-content: space-between; padding: 4mm 14mm 10mm; font-size: 8pt; opacity: 0.7;
  }
  body[data-template="studio"] .stu-craft-split { display: flex; gap: 4mm; margin-bottom: 4mm; }
  body[data-template="studio"] .stu-craft-split > div { flex: 1; min-width: 0; }
  body[data-template="studio"] .stu-sage-box {
    padding: 3mm; border-radius: 2mm; background: rgba(78, 107, 88, 0.12); font-size: 9.5pt;
  }
  body[data-template="studio"] .stu-sign-card {
    margin-top: 4mm; padding: 4mm; border: 0.3mm solid ${studioLinen}; border-radius: 2mm; background: rgb(255,255,255);
  }

  /* Field */
  body[data-template="field"] .template-field-cover {
    padding: 0 0 8mm; color: rgb(255,255,255); background: ${fieldSlate}; flex-direction: column;
  }
  body[data-template="field"] .fld-slate-band {
    position: absolute; left: 0; right: 0; top: 0; height: 38mm;
    background: linear-gradient(135deg, rgb(30, 43, 55) 45%, rgb(45, 58, 70) 45%);
    clip-path: polygon(0 0, 100% 0, 100% 72%, 0 100%); z-index: 0;
  }
  body[data-template="field"] .fld-cover-head { display: flex; align-items: center; gap: 3mm; padding: 12mm 14mm 4mm; position: relative; z-index: 1; }
  body[data-template="field"] .fld-biz { font-size: 9pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  body[data-template="field"] .fld-proof-badge {
    position: relative; z-index: 1; margin: 0 14mm; display: inline-block; align-self: flex-start;
    font-size: 7pt; font-weight: 800; letter-spacing: 0.12em; padding: 1mm 3mm; border-radius: 1mm;
    background: ${accent}; color: rgb(255,255,255);
  }
  body[data-template="field"] .fld-title { position: relative; z-index: 1; padding: 3mm 14mm 0; font-size: 28pt; line-height: 1.05; max-width: 150mm; }
  body[data-template="field"] .fld-strip { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 4mm; padding: 3mm 14mm 4mm; font-size: 8.5pt; opacity: 0.85; }
  body[data-template="field"] .fld-strip-item { display: inline-flex; align-items: center; gap: 1mm; }
  /* Figma hero 515×372 ≈ 131mm. */
  body[data-template="field"] .fld-hero-wrap {
    position: relative; z-index: 1; margin: 0 14mm; height: 128mm; border-radius: 2mm; overflow: hidden;
  }
  body[data-template="field"] .fld-hero { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  body[data-template="field"] .fld-gps-badge {
    position: absolute; right: 2mm; bottom: 2mm; background: rgba(0,0,0,0.55); color: rgb(255,255,255);
    font-size: 7pt; padding: 1mm 2mm; border-radius: 1mm; display: inline-flex; align-items: center; gap: 1mm;
  }
  body[data-template="field"] .fld-meta-light {
    position: relative; z-index: 1; margin: 5mm 14mm 0; padding: 3mm 4mm; background: rgb(255,255,255); color: ${ink}; border-radius: 2mm;
  }
  body[data-template="field"] .fld-cover-foot {
    position: relative; z-index: 1; display: flex; justify-content: space-between; padding: 4mm 14mm 0; font-size: 8pt; opacity: 0.7;
  }
  body[data-template="field"] .fld-cert-box {
    border: 0.4mm solid ${line}; border-radius: 2mm; padding: 4mm; margin-bottom: 4mm; background: rgb(255,255,255);
  }
  body[data-template="field"] .fld-cert-title { font-size: 10pt; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2mm; }
  body[data-template="field"] .prem-guarantee {
    font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    color: ${accent}; border: 0.4mm solid ${accent}; padding: 1mm 3mm; border-radius: 999px;
  }

  /* Atelier */
  body[data-template="atelier"] .sheet-cover.premium-cover {
    color: ${atelierForest}; padding: 11mm 12mm 10mm; align-items: center; text-align: center;
  }
  body[data-template="atelier"] .atl-page-border {
    position: absolute; inset: 7mm; border: 0.25mm solid rgba(36, 54, 44, 0.35); pointer-events: none;
  }
  body[data-template="atelier"] .atl-biz-center {
    font-family: ${instrumentStack()}; font-size: 22pt; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 400;
  }
  body[data-template="atelier"] .atl-terracotta { font-size: 8.5pt; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(181, 107, 83); margin-top: 1mm; }
  body[data-template="atelier"] .atl-diamond { color: rgb(181, 107, 83); margin: 3mm 0; display: block; }
  body[data-template="atelier"] .atl-framed-photo { width: 100%; margin: 2mm 0 4mm; }
  body[data-template="atelier"] .atl-frame-outer { border: 0.25mm solid ${atelierForest}; padding: 1.5mm; }
  /* Figma framed hero 451×400 ≈ 141mm. */
  body[data-template="atelier"] .atl-frame-inner {
    position: relative; border: 0.25mm solid ${atelierForest}; padding: 1.5mm; overflow: hidden; height: 132mm;
  }
  body[data-template="atelier"] .atl-frame-inner .prem-cover-photo { position: absolute; inset: 1.5mm; width: calc(100% - 3mm); height: calc(100% - 3mm); object-fit: cover; }
  body[data-template="atelier"] .atl-title { font-family: ${instrumentStack()}; font-size: 28pt; font-weight: 400; line-height: 1.1; max-width: 160mm; }
  body[data-template="atelier"] .template-atelier-cover .prem-meta-cols { justify-content: center; margin-top: 4mm; }
  body[data-template="atelier"] .atl-record { margin-top: auto; font-size: 8pt; letter-spacing: 0.1em; opacity: 0.65; padding-top: 4mm; }
  body[data-template="atelier"] .prem-swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm; margin: 2mm 0 4mm; }
  body[data-template="atelier"] .prem-swatch-chip { display: block; width: 100%; aspect-ratio: 1; border-radius: 2mm; border: 0.3mm solid ${line}; }
  body[data-template="atelier"] .prem-swatch-label { display: block; margin-top: 1mm; font-size: 7.5pt; text-align: center; }
  body[data-template="atelier"] .atl-prep-table { display: flex; gap: 5mm; margin-bottom: 4mm; }
  body[data-template="atelier"] .atl-prep-table .prem-specs, body[data-template="atelier"] .atl-prep-table .prem-work { flex: 1; margin: 0; }
  body[data-template="atelier"] .atl-soft-sign {
    padding: 4mm; border-radius: 3mm; background: rgb(255,255,255); border: 0.3mm solid ${line}; margin-top: 4mm;
  }

  /* Botanical */
  body[data-template="botanical"] .sheet-cover.premium-cover { color: ${botanicalMoss}; padding: 0; }
  body[data-template="botanical"] .bot-cover-head { display: flex; align-items: center; gap: 2mm; padding: 12mm 14mm 4mm; }
  body[data-template="botanical"] .bot-emblem { color: ${botanicalSage}; }
  body[data-template="botanical"] .bot-biz { font-size: 10pt; font-weight: 700; letter-spacing: 0.06em; }
  body[data-template="botanical"] .bot-handover-num { padding: 0 14mm; font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; opacity: 0.65; }
  body[data-template="botanical"] .bot-title { padding: 2mm 14mm 4mm; font-size: 28pt; line-height: 1.08; font-family: 'Newsreader', Georgia, serif; font-weight: 500; }
  body[data-template="botanical"] .bot-title-tail { font-style: italic; color: ${botanicalSage}; font-weight: 400; }
  body[data-template="botanical"] .bot-meta-bordered { padding: 4mm 14mm; border-top: 0.35mm solid rgba(27,49,38,0.2); border-bottom: 0.35mm solid rgba(27,49,38,0.2); }
  /* Figma hero 595×506 ≈ 179mm full-bleed. */
  body[data-template="botanical"] .bot-hero-full {
    position: relative; min-height: 140mm; height: 160mm; overflow: hidden; flex: 1 1 auto;
  }
  body[data-template="botanical"] .bot-hero-full .prem-cover-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  body[data-template="botanical"] .bot-moss-strip {
    display: flex; justify-content: space-between; align-items: center; padding: 3.5mm 14mm 10mm;
    background: ${botanicalWash}; font-size: 9.5pt;
  }
  body[data-template="botanical"] .bot-pages { font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; }
  body[data-template="botanical"] .bot-cards-row { display: flex; gap: 4mm; margin-bottom: 4mm; }
  body[data-template="botanical"] .bot-notes-card, body[data-template="botanical"] .bot-sage-card {
    flex: 1; min-width: 0; padding: 3.5mm; border-radius: 2mm;
  }
  body[data-template="botanical"] .bot-notes-card { background: rgb(255,255,255); border: 0.3mm solid ${line}; }
  body[data-template="botanical"] .bot-sage-card { background: rgba(125, 148, 104, 0.18); }
  body[data-template="botanical"] .prem-reading { background: ${botanicalWash}; border-color: rgba(27,49,38,0.12); }

  /* Stone */
  body[data-template="stone"] .sheet-cover.premium-cover { color: ${stoneInk}; padding: 0; }
  body[data-template="stone"] .sto-frame {
    position: absolute; inset: 8mm; border: 0.25mm solid rgba(28,31,34,0.35); pointer-events: none; z-index: 2;
  }
  body[data-template="stone"] .sto-cover-inner {
    position: relative; z-index: 1; padding: 14mm 12mm 10mm; display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1;
  }
  body[data-template="stone"] .sto-logo-center { margin-bottom: 2mm; }
  body[data-template="stone"] .sto-biz { font-family: ${outfitStack()}; font-size: 11pt; font-weight: 700; letter-spacing: 0.06em; }
  body[data-template="stone"] .sto-tag { font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; color: ${stoneTaupe}; margin-top: 1mm; }
  /* Figma hero 515×412 ≈ 145mm. */
  body[data-template="stone"] .sto-hero { position: relative; width: 100%; margin: 4mm 0; height: 118mm; overflow: hidden; border-radius: 1.5mm; }
  body[data-template="stone"] .sto-hero .prem-cover-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  body[data-template="stone"] .sto-handover { font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.7; width: 100%; text-align: left; }
  body[data-template="stone"] .sto-title {
    font-family: ${outfitStack()}; font-size: 30pt; font-weight: 500; font-style: italic; text-transform: lowercase;
    line-height: 1.05; width: 100%; text-align: left; margin: 2mm 0;
  }
  body[data-template="stone"] .sto-addr { font-size: 9.5pt; width: 100%; text-align: left; opacity: 0.8; margin-bottom: 3mm; }
  body[data-template="stone"] .sto-meta-band { width: 100%; background: rgb(255,255,255); border-radius: 2mm; padding: 3.5mm 4mm; margin-top: auto; }
  body[data-template="stone"] .sto-cover-foot {
    width: 100%; display: flex; justify-content: space-between; font-size: 8pt; opacity: 0.7; margin-top: 3mm;
  }
  body[data-template="stone"] .sto-head-ref { margin-left: auto; font-size: 8.5pt; opacity: 0.6; }
  body[data-template="stone"] .sto-verify-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5mm; margin-bottom: 4mm; }
  body[data-template="stone"] .sto-verify-card {
    border: 0.3mm solid ${line}; border-radius: 2mm; padding: 3mm; background: rgb(255,255,255);
    display: flex; flex-direction: column; gap: 1.5mm; min-height: 22mm;
  }
  body[data-template="stone"] .sto-verify-card.is-pass { border-color: ${stoneTaupe}; }
  body[data-template="stone"] .sto-verify-k { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.65; }
  body[data-template="stone"] .sto-verify-v { font-size: 10pt; font-weight: 700; display: flex; align-items: center; gap: 1mm; color: ${accent}; }
  body[data-template="stone"] .sto-spec-rows { margin-bottom: 3mm; }
  body[data-template="stone"] .sto-spec-row {
    display: flex; justify-content: space-between; gap: 3mm; padding: 2mm 0; border-bottom: 0.3mm solid ${line}; font-size: 9.5pt;
  }
  body[data-template="stone"] .sto-spec-k { font-weight: 600; opacity: 0.75; }
  body[data-template="stone"] .sto-spec-v { font-weight: 700; text-align: right; }
  body[data-template="stone"] .sto-aftercare {
    margin: 0 0 4mm; padding: 3.5mm; border-radius: 2mm; background: ${stoneWash}; font-size: 9.5pt;
  }
  body[data-template="stone"] .sto-sign-card {
    margin-top: 4mm; padding: 4mm; border: 0.3mm solid ${line}; border-radius: 2mm; background: rgb(255,255,255);
  }
  body[data-template="stone"] .template-stone .prem-section-title { font-family: ${outfitStack()}; }

  /* Solaris */
  body[data-template="solaris"] .template-solaris-cover {
    padding: 11mm 12mm 8mm; color: rgb(255,255,255); background: ${solarisForest};
  }
  body[data-template="solaris"] .sol-cover-head { display: flex; align-items: center; gap: 3mm; margin-bottom: 4mm; }
  body[data-template="solaris"] .sol-emblem { color: ${accent}; flex-shrink: 0; }
  body[data-template="solaris"] .sol-biz { font-size: 10pt; font-weight: 800; letter-spacing: 0.06em; }
  body[data-template="solaris"] .sol-tag { font-size: 7.5pt; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.75; margin-top: 0.5mm; }
  body[data-template="solaris"] .sol-report-pill {
    display: inline-block; align-self: flex-start; font-size: 7pt; font-weight: 800; letter-spacing: 0.14em;
    padding: 1mm 3mm; border-radius: 999px; background: ${accent}; color: ${solarisForest}; margin-bottom: 3mm;
  }
  body[data-template="solaris"] .sol-title { font-size: 26pt; line-height: 1.08; max-width: 165mm; margin-bottom: 2mm; }
  body[data-template="solaris"] .sol-addr { display: flex; align-items: flex-start; gap: 1.5mm; font-size: 9.5pt; opacity: 0.85; margin-bottom: 3mm; }
  body[data-template="solaris"] .sol-kpi-strip { display: flex; gap: 2.5mm; margin-bottom: 4mm; flex-wrap: wrap; }
  body[data-template="solaris"] .sol-kpi-pill {
    flex: 1; min-width: 28mm; background: rgba(255,255,255,0.1); border: 0.3mm solid rgba(255,255,255,0.2);
    border-radius: 2mm; padding: 2.5mm 3mm;
  }
  body[data-template="solaris"] .sol-kpi-v { display: block; font-size: 14pt; font-weight: 800; color: ${solarisGreen}; font-family: 'JetBrains Mono', monospace; }
  body[data-template="solaris"] .sol-kpi-k { display: block; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.75; margin-top: 1mm; }
  /* Figma hero 595×436 ≈ 154mm. */
  body[data-template="solaris"] .sol-hero-wrap {
    position: relative; margin: 0 -12mm; flex: 1 1 auto; min-height: 110mm; height: 132mm; max-height: 154mm; overflow: hidden;
  }
  body[data-template="solaris"] .sol-hero-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  body[data-template="solaris"] .sol-inset-card {
    position: absolute; right: 10mm; bottom: 8mm; width: 48mm; background: rgb(255,255,255); color: ${ink};
    border-radius: 2mm; padding: 2mm; box-shadow: 0 2mm 8mm rgba(0,0,0,0.25);
  }
  body[data-template="solaris"] .sol-inset-card .prem-shot-frame .prem-photo { height: 32mm; }
  body[data-template="solaris"] .sol-cover-foot { margin-top: 4mm; font-size: 8pt; opacity: 0.85; }
  body[data-template="solaris"] .sol-yield-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm; margin-bottom: 4mm; }
  body[data-template="solaris"] .sol-yield-card {
    border: 0.3mm solid ${line}; border-radius: 2mm; padding: 2.5mm 3mm; background: rgb(255,255,255);
  }
  body[data-template="solaris"] .sol-yield-k { display: block; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.65; }
  body[data-template="solaris"] .sol-yield-v { display: block; font-size: 12pt; font-weight: 800; margin-top: 1mm; color: ${accent}; }
  body[data-template="solaris"] .sol-commission { margin-bottom: 4mm; border-radius: 2mm; overflow: hidden; background: ${solarisForest}; color: rgb(255,255,255); }
  body[data-template="solaris"] .sol-commission-row {
    display: flex; justify-content: space-between; align-items: center; gap: 3mm; padding: 2.5mm 3.5mm;
    border-bottom: 0.25mm solid rgba(255,255,255,0.12); font-size: 9.5pt;
  }
  body[data-template="solaris"] .sol-commission-row.is-verified { background: rgba(22,163,95,0.15); }
  body[data-template="solaris"] .sol-verified-pill {
    font-size: 7pt; font-weight: 800; letter-spacing: 0.1em; padding: 0.6mm 2mm; border-radius: 999px;
    background: ${solarisGreen}; color: rgb(255,255,255);
  }
  body[data-template="solaris"] .sol-verified-pill.is-open { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); font-weight: 600; }

  /* Blueprint */
  body[data-template="blueprint"] .template-blueprint-cover {
    padding: 0; color: rgb(255,255,255); background: ${blueprintNavy}; position: relative;
  }
  body[data-template="blueprint"] .bpt-grid-bg {
    position: absolute; inset: 0; opacity: 0.35; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.08) 0.35mm, transparent 0.35mm),
      linear-gradient(90deg, rgba(255,255,255,0.08) 0.35mm, transparent 0.35mm);
    background-size: 6mm 6mm;
  }
  body[data-template="blueprint"] .bpt-crop {
    position: absolute; width: 8mm; height: 8mm; border-color: rgba(255,255,255,0.5); border-style: solid; pointer-events: none; z-index: 2;
  }
  body[data-template="blueprint"] .bpt-crop.tl { left: 6mm; top: 6mm; border-width: 0.4mm 0 0 0.4mm; }
  body[data-template="blueprint"] .bpt-crop.tr { right: 6mm; top: 6mm; border-width: 0.4mm 0.4mm 0 0; }
  body[data-template="blueprint"] .bpt-crop.bl { left: 6mm; bottom: 6mm; border-width: 0 0 0.4mm 0.4mm; }
  body[data-template="blueprint"] .bpt-crop.br { right: 6mm; bottom: 6mm; border-width: 0 0 0.4mm 0; border-right-width: 0.4mm; }
  body[data-template="blueprint"] .bpt-cover-inner { position: relative; z-index: 1; padding: 12mm 14mm 10mm; display: flex; flex-direction: column; flex: 1; }
  body[data-template="blueprint"] .bpt-cover-head { display: flex; align-items: center; gap: 3mm; margin-bottom: 4mm; }
  body[data-template="blueprint"] .bpt-biz { font-size: 9pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  body[data-template="blueprint"] .bpt-phase-pill {
    display: inline-block; align-self: flex-start; font-size: 7pt; font-weight: 800; letter-spacing: 0.12em;
    padding: 1mm 3mm; border: 0.3mm solid rgba(255,255,255,0.4); border-radius: 1mm; margin-bottom: 3mm;
  }
  body[data-template="blueprint"] .bpt-addr { font-size: 9.5pt; opacity: 0.85; margin-bottom: 2mm; }
  body[data-template="blueprint"] .bpt-title { font-size: 28pt; line-height: 1.05; margin-bottom: 3mm; max-width: 165mm; }
  body[data-template="blueprint"] .bpt-stage { margin-bottom: 3mm; }
  body[data-template="blueprint"] .bpt-stage-label { font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 1.5mm; opacity: 0.8; }
  body[data-template="blueprint"] .bpt-stage-bar { display: flex; gap: 1mm; }
  body[data-template="blueprint"] .bpt-stage-seg { flex: 1; height: 2.5mm; background: rgba(255,255,255,0.15); border-radius: 0.5mm; }
  body[data-template="blueprint"] .bpt-stage-seg.is-done { background: ${blueprintGold}; }
  body[data-template="blueprint"] .bpt-stage-seg.is-empty { opacity: 0.35; }
  body[data-template="blueprint"] .bpt-dimension { display: flex; align-items: center; gap: 2mm; margin: 2mm 0 3mm; opacity: 0.5; }
  body[data-template="blueprint"] .bpt-dim-line { flex: 1; height: 0; border-top: 0.35mm solid rgba(255,255,255,0.6); }
  body[data-template="blueprint"] .bpt-dim-tick { width: 0; height: 4mm; border-left: 0.35mm solid rgba(255,255,255,0.6); }
  /* Figma hero 515×354 ≈ 125mm. */
  body[data-template="blueprint"] .bpt-hero {
    position: relative; height: 112mm; overflow: hidden; margin-bottom: 4mm; border: 0.3mm solid rgba(255,255,255,0.25);
  }
  body[data-template="blueprint"] .bpt-hero .prem-cover-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  body[data-template="blueprint"] .bpt-title-block {
    background: rgb(255,255,255); color: ${ink}; border-radius: 2mm; padding: 3.5mm 4mm; margin-top: auto;
  }

  /* Clearline */
  body[data-template="clearline"] .sheet-cover.premium-cover { color: ${clearlineCharcoal}; padding: 0; }
  body[data-template="clearline"] .clr-cover-split { display: flex; min-height: 297mm; width: 100%; }
  body[data-template="clearline"] .clr-cover-copy {
    flex: 1; min-width: 0; padding: 12mm 10mm 10mm 12mm; display: flex; flex-direction: column; gap: 2mm;
  }
  body[data-template="clearline"] .clr-eyebrow { font-size: 8pt; font-weight: 800; letter-spacing: 0.14em; color: ${clearlineBlue}; margin-top: 3mm; }
  body[data-template="clearline"] .clr-title { font-size: 26pt; font-weight: 700; line-height: 1.08; margin: 2mm 0; }
  body[data-template="clearline"] .clr-addr { font-size: 9.5pt; opacity: 0.85; margin-bottom: 3mm; }
  body[data-template="clearline"] .clr-cover-meta { margin: 2mm 0 4mm; }
  body[data-template="clearline"] .clr-biz { font-size: 9pt; font-weight: 700; letter-spacing: 0.06em; margin-top: auto; }
  body[data-template="clearline"] .clr-pages { opacity: 0.65; margin-top: 2mm; }
  body[data-template="clearline"] .clr-cover-photo {
    position: relative; width: 82mm; flex-shrink: 0; overflow: hidden; background: rgb(220,228,236); align-self: stretch;
  }
  body[data-template="clearline"] .clr-hero-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  body[data-template="clearline"] .clr-spec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2.5mm; margin-bottom: 4mm; }
  body[data-template="clearline"] .clr-spec-card {
    border: 0.3mm solid ${line}; border-radius: 2mm; padding: 3mm; background: rgb(255,255,255);
  }
  body[data-template="clearline"] .clr-spec-k { display: block; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.65; }
  body[data-template="clearline"] .clr-spec-v { display: block; font-size: 10pt; font-weight: 700; margin-top: 1mm; color: ${accent}; }
  body[data-template="clearline"] .clr-checklist { margin-bottom: 4mm; }
  body[data-template="clearline"] .clr-check-row {
    display: flex; justify-content: space-between; align-items: center; gap: 3mm; padding: 2.2mm 0;
    border-bottom: 0.3mm solid ${line}; font-size: 9.5pt;
  }
  body[data-template="clearline"] .clr-verified-pill {
    font-size: 7pt; font-weight: 800; letter-spacing: 0.1em; padding: 0.6mm 2.5mm; border-radius: 999px;
    background: ${clearlineBlue}; color: rgb(255,255,255);
  }
  body[data-template="clearline"] .clr-verified-pill.is-open { background: rgb(235,235,235); color: ${muted}; font-weight: 600; }
  body[data-template="clearline"] .clr-guarantee-band {
    margin: 0 0 4mm; padding: 4mm; border-radius: 2mm; background: rgba(46,122,184,0.12); font-size: 9.5pt;
  }
  body[data-template="clearline"] .clr-guarantee-title { font-size: 10pt; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2mm; color: ${clearlineBlue}; }
  body[data-template="clearline"] .clr-sign-card {
    margin-top: 4mm; padding: 4mm; border: 0.3mm solid ${line}; border-radius: 2mm; background: rgb(255,255,255);
  }

  /* Sentinel */
  body[data-template="sentinel"] .template-sentinel-cover {
    padding: 10mm 12mm 8mm; color: rgb(255,255,255); background: ${sentinelInk};
  }
  body[data-template="sentinel"] .sen-cover-head {
    display: flex; align-items: flex-start; gap: 3mm; margin-bottom: 5mm; padding-bottom: 3.5mm;
    border-bottom: 0.25mm solid rgba(255,255,255,0.12);
  }
  body[data-template="sentinel"] .sen-aperture { color: ${sentinelTeal}; flex-shrink: 0; }
  body[data-template="sentinel"] .sen-biz {
    font-size: 11pt; font-weight: 800; letter-spacing: 0.28em; text-transform: uppercase; line-height: 1.1;
  }
  body[data-template="sentinel"] .sen-tag {
    font-family: 'JetBrains Mono', monospace; font-size: 6.5pt; letter-spacing: 0.14em;
    text-transform: uppercase; color: #9CA3AF; margin-top: 1mm;
  }
  body[data-template="sentinel"] .sen-ref { margin-left: auto; color: #9CA3AF; font-size: 7pt; text-align: right; max-width: 55mm; }
  body[data-template="sentinel"] .sen-armed {
    display: flex; align-items: center; gap: 2mm; font-family: 'JetBrains Mono', monospace;
    font-size: 7pt; font-weight: 700; letter-spacing: 0.1em; color: ${sentinelRed}; margin-bottom: 2.5mm;
  }
  body[data-template="sentinel"] .sen-armed-dot {
    width: 2mm; height: 2mm; border-radius: 999px; background: ${sentinelRed}; flex-shrink: 0;
  }
  body[data-template="sentinel"] .sen-title {
    font-size: 26pt; font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 2.5mm; max-width: 170mm;
  }
  body[data-template="sentinel"] .sen-sub { font-size: 9pt; color: #9CA3AF; margin-bottom: 3.5mm; max-width: 170mm; }
  body[data-template="sentinel"] .sen-status-pill {
    display: inline-flex; align-items: center; gap: 2mm; align-self: flex-start;
    padding: 1.6mm 3.5mm; border-radius: 999px; border: 0.3mm solid ${sentinelTeal};
    background: rgba(18,148,127,0.12); color: ${sentinelMint};
    font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; font-weight: 600; margin-bottom: 4mm;
  }
  body[data-template="sentinel"] .sen-status-dot {
    width: 2mm; height: 2mm; border-radius: 999px; background: ${sentinelTeal}; flex-shrink: 0;
  }
  /* Figma hero 515×386 ≈ 136mm. */
  body[data-template="sentinel"] .sen-hero {
    position: relative; margin: 0 0 4mm; height: 118mm; overflow: hidden; background: #0A0C10;
  }
  body[data-template="sentinel"] .sen-hero-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  body[data-template="sentinel"] .sen-hud-brackets {
    position: absolute; inset: 3mm; border: 0.35mm solid rgba(255,255,255,0.55); pointer-events: none;
    box-shadow: inset 0 0 0 0.8mm rgba(17,20,25,0.15);
  }
  body[data-template="sentinel"] .sen-hud-brackets::before,
  body[data-template="sentinel"] .sen-hud-brackets::after {
    content: ''; position: absolute; width: 4mm; height: 4mm; border: 0.45mm solid rgba(255,255,255,0.9);
  }
  body[data-template="sentinel"] .sen-hud-brackets::before { left: -0.45mm; top: -0.45mm; border-right: 0; border-bottom: 0; }
  body[data-template="sentinel"] .sen-hud-brackets::after { right: -0.45mm; bottom: -0.45mm; border-left: 0; border-top: 0; }
  body[data-template="sentinel"] .sen-hud-top,
  body[data-template="sentinel"] .sen-hud-time {
    position: absolute; display: flex; align-items: center; gap: 2.5mm;
    background: rgba(17,20,25,0.72); padding: 1.2mm 2.2mm;
    font-family: 'JetBrains Mono', monospace; font-size: 6.5pt; color: rgb(255,255,255);
  }
  body[data-template="sentinel"] .sen-hud-top { left: 4mm; top: 4mm; }
  body[data-template="sentinel"] .sen-hud-time { right: 4mm; bottom: 4mm; }
  body[data-template="sentinel"] .sen-rec {
    display: inline-flex; align-items: center; gap: 1.2mm; font-weight: 700;
  }
  body[data-template="sentinel"] .sen-rec::before {
    content: ''; width: 1.6mm; height: 1.6mm; border-radius: 999px; background: ${sentinelRed};
  }
  body[data-template="sentinel"] .sen-meta-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); border: 0.3mm solid rgba(255,255,255,0.12); margin-bottom: 4mm;
  }
  body[data-template="sentinel"] .sen-meta-cell {
    padding: 2.5mm 3mm; border-right: 0.3mm solid rgba(255,255,255,0.12);
    border-bottom: 0.3mm solid rgba(255,255,255,0.12);
  }
  body[data-template="sentinel"] .sen-meta-cell:nth-child(3n) { border-right: 0; }
  body[data-template="sentinel"] .sen-meta-cell:nth-child(n+4) { border-bottom: 0; }
  body[data-template="sentinel"] .sen-meta-k {
    display: block; font-family: 'JetBrains Mono', monospace; font-size: 5.5pt;
    letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 1mm;
  }
  body[data-template="sentinel"] .sen-meta-v { display: block; font-size: 8.5pt; font-weight: 600; }
  body[data-template="sentinel"] .sen-cover-foot {
    display: flex; justify-content: space-between; align-items: center; color: #9CA3AF; font-size: 6.5pt; margin-top: auto;
  }
  body[data-template="sentinel"] .sen-body-head {
    display: flex; align-items: center; gap: 2.5mm; margin-bottom: 4mm; padding-bottom: 2.5mm;
    border-bottom: 0.45mm solid ${sentinelInk};
  }
  body[data-template="sentinel"] .sen-biz-sm { font-size: 9pt; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; }
  body[data-template="sentinel"] .sen-page { margin-left: auto; }
  body[data-template="sentinel"] .sen-zone-head-row {
    display: flex; align-items: center; gap: 2.5mm; margin-bottom: 2.5mm;
  }
  body[data-template="sentinel"] .sen-zone-head-row .prem-section-title { margin: 0; flex: 1; }
  body[data-template="sentinel"] .sen-zone-head-row .prem-sec-num { color: ${sentinelRed}; font-family: 'JetBrains Mono', monospace; }
  body[data-template="sentinel"] .sen-online { color: #6B7280; font-size: 6.5pt; }
  body[data-template="sentinel"] .sen-zone-table {
    border: 0.3mm solid #E5E7EB; border-radius: 1.2mm; overflow: hidden; margin-bottom: 5mm;
  }
  body[data-template="sentinel"] .sen-zone-header {
    display: grid; grid-template-columns: 14mm 28mm 28mm 18mm 1fr; gap: 2mm; align-items: center;
    background: ${sentinelInk}; color: #9CA3AF; padding: 1.8mm 2.8mm;
    font-family: 'JetBrains Mono', monospace; font-size: 5.8pt; letter-spacing: 0.06em; text-transform: uppercase;
  }
  body[data-template="sentinel"] .sen-zone-row {
    display: grid; grid-template-columns: 14mm 28mm 28mm 18mm 1fr; gap: 2mm; align-items: center;
    padding: 2.2mm 2.8mm; font-size: 8pt; border-top: 0.25mm solid #E5E7EB; background: rgb(255,255,255);
  }
  body[data-template="sentinel"] .sen-zone-row.is-alt { background: ${sentinelWash}; }
  body[data-template="sentinel"] .sen-zone-id { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 7.5pt; }
  body[data-template="sentinel"] .sen-zone-loc { font-weight: 600; }
  body[data-template="sentinel"] .sen-zone-dev,
  body[data-template="sentinel"] .sen-zone-sn { color: #6B7280; font-size: 7.5pt; }
  body[data-template="sentinel"] .sen-zone-sn { font-family: 'JetBrains Mono', monospace; }
  body[data-template="sentinel"] .sen-zone-status {
    justify-self: end; font-family: 'JetBrains Mono', monospace; font-size: 6pt; font-weight: 700;
    letter-spacing: 0.04em; color: ${sentinelTeal}; background: rgba(18,148,127,0.12);
    padding: 0.8mm 1.8mm; border-radius: 1mm;
  }
  body[data-template="sentinel"] .sen-cam-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 5mm;
  }
  body[data-template="sentinel"] .sen-cam-card { margin: 0; }
  body[data-template="sentinel"] .sen-cam-frame {
    position: relative; height: 42mm; overflow: hidden; border-radius: 1mm; background: ${sentinelInk}; margin-bottom: 1.5mm;
  }
  body[data-template="sentinel"] .sen-cam-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
  body[data-template="sentinel"] .sen-cam-empty { background: #1A1F27; }
  body[data-template="sentinel"] .sen-cam-hud {
    position: absolute; left: 2mm; top: 2mm; display: flex; align-items: center; gap: 1.5mm;
    background: rgba(17,20,25,0.72); padding: 0.8mm 1.6mm;
    font-family: 'JetBrains Mono', monospace; font-size: 5.5pt; color: rgb(255,255,255);
  }
  body[data-template="sentinel"] .sen-cam-card figcaption { font-size: 8pt; font-weight: 600; }
  body[data-template="sentinel"] .sen-check-cols {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 6mm; margin-bottom: 4mm;
  }
  body[data-template="sentinel"] .sen-check-row {
    display: flex; align-items: flex-start; gap: 2mm; font-size: 8.5pt; font-weight: 500; margin-bottom: 2mm;
  }
  body[data-template="sentinel"] .sen-tick {
    width: 3.2mm; height: 3.2mm; border-radius: 999px; background: ${sentinelTeal}; color: rgb(255,255,255);
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 0.4mm;
  }
  body[data-template="sentinel"] .sen-tick svg { width: 2.2mm; height: 2.2mm; }
  body[data-template="sentinel"] .sen-tick.is-open { background: #E5E7EB; }
  body[data-template="sentinel"] .sen-privacy {
    display: flex; align-items: center; gap: 3mm; background: ${sentinelWash}; margin-bottom: 4mm; min-height: 14mm;
  }
  body[data-template="sentinel"] .sen-privacy-bar { width: 1.2mm; align-self: stretch; background: ${sentinelRed}; flex-shrink: 0; }
  body[data-template="sentinel"] .sen-lock { color: ${sentinelInk}; flex-shrink: 0; }
  body[data-template="sentinel"] .sen-privacy-copy { flex: 1; min-width: 0; padding: 2mm 0; }
  body[data-template="sentinel"] .sen-privacy-title { font-size: 9.5pt; font-weight: 800; margin-bottom: 0.8mm; }
  body[data-template="sentinel"] .sen-privacy-body { font-size: 7.5pt; color: #6B7280; }
  body[data-template="sentinel"] .sen-aes {
    color: ${sentinelRed}; font-size: 6.5pt; font-weight: 700; letter-spacing: 0.04em; padding-right: 3.5mm;
  }
  body[data-template="sentinel"] .sen-signoff {
    margin-top: 3mm; padding: 4mm; border-radius: 1.2mm; background: ${sentinelInk}; color: rgb(255,255,255);
  }
  `;
}