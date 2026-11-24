import { CoverDesignId, isPremiumTradeTemplate, ReportImageMask, ReportTemplateId } from '@/models';
import { buildReportPreviewHtml } from '@/services/pdfService/reportHtml';
import { ReportHtmlInput } from '@/services/pdfService/types';

const FALLBACK_ACCENT = '#1FA84A';
const EXAMPLE_DATE = '2026-04-12T09:00:00.000Z';

export type LayoutExampleBranding = {
  businessName?: string | null;
  accentColor?: string | null;
  footerMessage?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Data URI for the branding cover. Omitted when the built-in cover is in use. */
  coverImageDataUri?: string | null;
  /** Data URI for the branding thank-you photo. */
  thanksImageDataUri?: string | null;
  imageMask?: ReportImageMask | null;
  coverDesign?: CoverDesignId | null;
};

type TradeDemo = {
  businessName: string;
  accent: string;
  title: string;
  reference: string;
  customer: string;
  address: string;
  description: string;
  workCompleted: string;
  materials: string;
  recommendations: string;
  checklist: { label: string; checked: boolean }[];
  beforeCaptions: [string, string];
  afterCaptions: [string, string, string];
};

const TRADE_DEMOS: Partial<Record<ReportTemplateId, TradeDemo>> = {
  thermal: {
    businessName: 'Northline Heating',
    accent: '#C8773E',
    title: 'Boiler service & gas safety',
    reference: 'NH-2148',
    customer: 'Mr James Whitaker',
    address: '18 Cedar Avenue, Leeds LS6 2QR',
    description: 'Annual service with combustion readings and landlord gas safety certificate.',
    workCompleted: 'Combustion analysed\nBurner cleaned\nFlue integrity checked\nControls demonstrated',
    materials: 'New anode rod\nWashers and seals\nCombustion printout',
    recommendations: 'Book the next service within 12 months. Keep vents clear.',
    checklist: [
      { label: 'Flow temp: 62°C', checked: true },
      { label: 'CO reading: Pass', checked: true },
      { label: 'Gas tightness: Pass', checked: true },
      { label: 'Safety devices: Pass', checked: true },
    ],
    beforeCaptions: ['Boiler before service', 'Flue terminal'],
    afterCaptions: ['Serviced boiler', 'Controls set', 'Certificate issued'],
  },
  circuit: {
    businessName: 'Volt & Co Electrical',
    accent: '#F5A623',
    title: 'Consumer unit upgrade',
    reference: 'VC-0891',
    customer: 'Ms Aisha Rahman',
    address: '4 Quay Street, Bristol BS1 4AX',
    description: 'Replace the fuse board with a dual RCD board and full circuit testing.',
    workCompleted: 'Board swapped\nCircuits labelled\nEICR schedule completed',
    materials: 'Dual RCD board\nMCBs\nEarth bonding clamps',
    recommendations: 'Do not overload spur circuits. Retain this report with the EICR.',
    checklist: [
      { label: 'Ze reading', checked: true },
      { label: 'RCD trip times', checked: true },
      { label: 'Ring continuity', checked: true },
      { label: 'Insulation resistance', checked: true },
    ],
    beforeCaptions: ['Old fuse board', 'Meter tails'],
    afterCaptions: ['New consumer unit', 'Labelled circuits', 'Test schedule'],
  },
  studio: {
    businessName: 'Ash & Grain Joinery',
    accent: '#4E6B58',
    title: 'Bespoke kitchen handover',
    reference: 'AG-441',
    customer: 'The Patel family',
    address: '9 Mill Lane, Cambridge CB2 1AB',
    description: 'Oak shaker kitchen with quartz worktops and soft-close hardware.',
    workCompleted: 'Carcasses fitted\nDoors hung and adjusted\nWorktops scribed\nAppliances connected',
    materials: 'Oak shaker doors\nQuartz worktop\nBrass handles\nSoft-close hinges',
    recommendations: 'Oil timber annually. Avoid abrasive cleaners on quartz.',
    checklist: [
      { label: 'Doors aligned', checked: true },
      { label: 'Drawers soft-close', checked: true },
      { label: 'Worktop sealed', checked: true },
      { label: 'Appliances tested', checked: true },
    ],
    beforeCaptions: ['Room before fit', 'Old units removed'],
    afterCaptions: ['Finished kitchen', 'Island detail', 'Hardware close-up'],
  },
  field: {
    businessName: 'Ridgeway Roofing',
    accent: '#C7593A',
    title: 'Rear roof strip and re-tile',
    reference: 'RR-307',
    customer: 'Mrs Helen Brooks',
    address: '22 Hillcrest Road, Sheffield S10 3FN',
    description: 'Strip the rear pitch, renew underlay and battens, and retile to match.',
    workCompleted: 'Pitch stripped\nUnderlay renewed\nTiles laid\nRidge bedded',
    materials: 'Concrete interlocking tiles\nBreathable underlay\nTreated battens',
    recommendations: 'Clear gutters each autumn. Contact us if tiles shift after storms.',
    checklist: [
      { label: 'Scaffold signed off', checked: true },
      { label: 'Underlay continuous', checked: true },
      { label: 'Flashings sealed', checked: true },
      { label: 'Site cleared', checked: true },
    ],
    beforeCaptions: ['Damaged pitch', 'Lifted tiles'],
    afterCaptions: ['Completed roof', 'Ridge line', 'Gutter detail'],
  },
  atelier: {
    businessName: 'Lumen Decor',
    accent: '#B56B53',
    title: 'Reception repaint',
    reference: 'LD-118',
    customer: 'Brightside Clinics',
    address: 'Unit 2, Harbour Walk, Brighton BN1 1AA',
    description: 'Full prep and two coats throughout the reception and corridor.',
    workCompleted: 'Walls washed and filled\nCeilings mist-coated\nTwo finish coats applied',
    materials: 'Base coat: Soft Clay\nMid tone: Linen Mist\nAccent: Terracotta\nTrim: Bone White',
    recommendations: 'Allow 14 days before washing walls. Touch-up pots left on site.',
    checklist: [
      { label: 'Prep complete', checked: true },
      { label: 'Mist coat dry', checked: true },
      { label: 'Finish coats even', checked: true },
      { label: 'Trim sharp', checked: true },
    ],
    beforeCaptions: ['Walls before prep', 'Existing colour'],
    afterCaptions: ['Finished reception', 'Accent wall', 'Trim detail'],
  },
  botanical: {
    businessName: 'Greenward Gardens',
    accent: '#7D9468',
    title: 'Rear garden transformation',
    reference: 'GG-552',
    customer: 'Mr & Mrs Cole',
    address: '7 Orchard Close, Bath BA2 4PQ',
    description: 'New patio, raised beds, and planting scheme for year-round colour.',
    workCompleted: 'Patio laid\nBeds built\nIrrigation fitted\nPlanting complete',
    materials: 'Indian sandstone\nSleepers\nTopsoil and mulch\nSeasonal shrubs',
    recommendations: 'Water new planting daily for two weeks. Mulch each spring.',
    checklist: [
      { label: 'Levels checked', checked: true },
      { label: 'Drainage falls', checked: true },
      { label: 'Irrigation tested', checked: true },
      { label: 'Plant labels left', checked: true },
    ],
    beforeCaptions: ['Garden before works', 'Old patio'],
    afterCaptions: ['Finished garden', 'Raised beds', 'Planting detail'],
  },
  stone: {
    businessName: 'Kestrel Bathrooms',
    accent: '#8A7F72',
    title: 'Wetroom & tiling handover',
    reference: 'KB-0931',
    customer: 'Ms Clara Benson',
    address: '31 Manor Gardens, Kingston KT2 7EU',
    description: 'Walk-in wetroom with large-format porcelain and underfloor heating.',
    workCompleted: 'Tanking completed\nUFH tested\nTiles laid\nBrassware fitted',
    materials: 'Tiles: 600×1200 porcelain\nBrassware: Gunmetal mixer\nDrainage: Linear drain\nScreen: 10mm frameless glass',
    recommendations: 'Squeegee glass after each use. pH-neutral cleaners only.',
    checklist: [
      { label: 'Tanking membrane: Verified', checked: true },
      { label: 'Electric UFH: 18.4 Ω pass', checked: true },
      { label: 'Silicone & grout: 24h cured', checked: true },
    ],
    beforeCaptions: ['Dated suite', 'Failed grout'],
    afterCaptions: ['Walk-in wetroom', 'Tile detail', 'Brassware'],
  },
  solaris: {
    businessName: 'Helios Energy',
    accent: '#16A35F',
    title: 'Solar PV & battery commissioning',
    reference: 'HE-5402',
    customer: 'Mr Tom Hargreaves',
    address: '6 Orchard Close, Winchester SO23 9JT',
    description: '5.4 kWp array with 10.2 kWh battery and MCS commissioning.',
    workCompleted: 'Panels fixed\nInverter commissioned\nBattery online\nApp handed over',
    materials: 'System size: 5.4 kWp\nEst. output: 4,650 kWh/yr\nBattery storage: 10.2 kWh\nCO₂ saved: 980 kg/yr',
    recommendations: 'Keep the inverter clear of clutter. Review generation monthly in the app.',
    checklist: [
      { label: '5.4 kWp array', checked: true },
      { label: '10.2 kWh battery', checked: true },
      { label: 'MCS-04821 certificate', checked: true },
      { label: 'Export limited: Pass', checked: true },
    ],
    beforeCaptions: ['Roof before panels', 'Garage wall'],
    afterCaptions: ['Roof array', 'Inverter & battery', 'App dashboard'],
  },
  blueprint: {
    businessName: 'Cromwell & Ward',
    accent: '#E0A222',
    title: 'Single-storey rear extension',
    reference: 'CW-2026-19',
    customer: 'Mr & Mrs Okafor',
    address: '112 Victoria Road, St Albans AL1 3TF',
    description: 'Phase 3 site report — first fix and steelwork complete.',
    workCompleted: 'Foundations poured\nBlockwork to plate\nSteelwork installed\nFirst fix underway',
    materials: 'Concrete mix\nConcrete blocks\nSteel RSJs\nDamp proof course',
    recommendations: 'Building Control inspection booked for plaster stage.',
    checklist: [
      { label: '01 Groundworks', checked: true },
      { label: '02 Superstructure', checked: true },
      { label: '03 First fix', checked: true },
      { label: '04 Plaster', checked: false },
      { label: '05 Handover', checked: false },
    ],
    beforeCaptions: ['Site clearance', 'Foundations'],
    afterCaptions: ['Shell complete', 'Steelwork', 'First fix'],
  },
  clearline: {
    businessName: 'Clearline Glazing',
    accent: '#2E7AB8',
    title: 'Architectural glazing & installation',
    reference: 'CL-2204',
    customer: 'Dr Priya Mehta',
    address: '15 Riverside Quay, Manchester M3 4JN',
    description: 'Bi-fold doors and fixed sidelights with low-E triple glazing.',
    workCompleted: 'Opening prepared\nFrames installed\nGlazing sealed\nHardware adjusted',
    materials: 'U-value: 1.2 W/m²K\nGlass: Triple low-E\nFrame: Aluminium RAL 7016\nHardware: Multi-point locks',
    recommendations: '10-year structural guarantee. Lubricate rollers annually.',
    checklist: [
      { label: 'Opening square', checked: true },
      { label: 'Sealant continuous', checked: true },
      { label: 'Multi-point shootbolts', checked: true },
      { label: 'Safety glazing marked', checked: true },
    ],
    beforeCaptions: ['Opening before install', 'Old patio doors'],
    afterCaptions: ['Bi-fold open', 'Closed elevation', 'Threshold detail'],
  },
  sentinel: {
    businessName: 'Aegis Security',
    accent: '#12947F',
    title: 'CCTV & access control installation',
    reference: 'AS-8841',
    customer: 'Mrs Helen Marsh',
    address: '88 High Street, Sevenoaks TN13 1LP',
    description: '4K PoE CCTV, smart keypad and 3-star cylinder upgrade with encrypted local NVR.',
    workCompleted: 'Cameras aligned\nNVR commissioned\nCylinder fitted\nKeypad paired',
    materials:
      'CH-01 · Front Drive · 4K PoE Turret · SN-4410\nCH-02 · Rear Garden · 4K PoE Turret · SN-4411\nDR-01 · Front Door · 3-Star Euro Cylinder · UL-902\nKP-01 · Porch Entry · Smart Keypad · KP-310\nRecorder: 4-ch 4K NVR · 2 TB\nRetention: 30 days · local only\nCertificate: AS-CERT-8841',
    recommendations: 'Recordings stay on the local NVR. Keep CCTV signage visible. Change passwords if staff leave.',
    checklist: [
      { label: 'Homeowner app paired to NVR', checked: true },
      { label: 'Two-factor authentication enabled', checked: true },
      { label: 'Default passwords changed', checked: true },
      { label: 'CCTV signage displayed', checked: true },
      { label: 'Local NVR · 30-day retention', checked: true },
      { label: '3 master keys handed over', checked: true },
      { label: 'No cloud subscription required', checked: true },
      { label: 'Privacy masks over neighbouring land', checked: true },
    ],
    beforeCaptions: ['Front entry before', 'Old lock cylinder'],
    afterCaptions: ['Front entry camera', 'Rear garden view', 'Keypad & cylinder'],
  },
};

function svgPhoto(tone: 'before' | 'after', accent: string, index: number): string {
  const sky = tone === 'before' ? '#D5D9D4' : '#E5F4EA';
  const block = tone === 'before' ? '#7E8781' : accent;
  const shift = index * 36;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="${sky}"/>
    <rect x="${70 + shift}" y="${140 + index * 18}" width="230" height="250" rx="8" fill="${block}"/>
    <rect x="${340 - index * 20}" y="200" width="300" height="180" rx="6" fill="#FFFFFF" fill-opacity="0.72"/>
    <rect x="70" y="460" width="630" height="16" rx="4" fill="#141816" fill-opacity="0.12"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function accentOrFallback(value: string | null | undefined, demoAccent?: string): string {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (demoAccent && /^#[0-9a-fA-F]{6}$/.test(demoAccent)) return demoAccent;
  return FALLBACK_ACCENT;
}

/** A short sample job in the real report HTML, so a layout can be judged before it is used. */
export function buildLayoutExampleHtml(template: ReportTemplateId, branding: LayoutExampleBranding = {}): string {
  const demo = isPremiumTradeTemplate(template) ? TRADE_DEMOS[template] : undefined;
  const accent = accentOrFallback(branding.accentColor, demo?.accent);
  const businessName = branding.businessName?.trim() || demo?.businessName || 'Your business';

  const beforeCaptions = demo?.beforeCaptions ?? (['Units before the strip-out', 'Old sink and taps'] as const);
  const afterCaptions = demo?.afterCaptions ?? (['Finished kitchen', 'New worktop', 'Sink and tiling'] as const);

  const input: ReportHtmlInput = {
    business: {
      name: businessName,
      logoDataUri: null,
      email: branding.email?.trim() || 'hello@yourbusiness.com',
      phone: branding.phone?.trim() || '07700 900 000',
      website: null,
      address: null,
      registrationNumber: null,
      vatNumber: null,
      accentColor: accent,
      footerMessage: branding.footerMessage?.trim() || 'Thank you for choosing us.',
    },
    job: {
      title: demo?.title ?? 'Kitchen refit',
      referenceNumber: demo?.reference ?? 'A-104',
      jobDate: '2026-04-12',
      customerName: demo?.customer ?? 'Sample customer',
      address: demo?.address ?? '14 Oak Street',
      description: demo?.description ?? 'Replace the tired kitchen and leave the room ready to use.',
      status: 'complete',
    },
    before: [
      {
        id: 'example-before-1',
        dataUri: svgPhoto('before', accent, 0),
        caption: beforeCaptions[0],
        width: 800,
        height: 600,
      },
      {
        id: 'example-before-2',
        dataUri: svgPhoto('before', accent, 1),
        caption: beforeCaptions[1],
        width: 800,
        height: 600,
      },
    ],
    during: [],
    after: [
      {
        id: 'example-after-1',
        dataUri: svgPhoto('after', accent, 0),
        caption: afterCaptions[0],
        width: 800,
        height: 600,
      },
      {
        id: 'example-after-2',
        dataUri: svgPhoto('after', accent, 1),
        caption: afterCaptions[1],
        width: 800,
        height: 600,
      },
      {
        id: 'example-after-3',
        dataUri: svgPhoto('after', accent, 2),
        caption: afterCaptions[2],
        width: 800,
        height: 600,
      },
    ],
    workCompleted: demo?.workCompleted ?? 'Units fitted, worktop scribed, and the sink connected.',
    materials: demo?.materials ?? 'Base units\nOak worktop\nNew sink\nWall tiles',
    recommendations: demo?.recommendations ?? 'Seal the worktop again after the first month.',
    checklist: demo?.checklist ?? null,
    ...(branding.coverImageDataUri ? { brandCoverDataUri: branding.coverImageDataUri } : {}),
    ...(branding.thanksImageDataUri ? { brandThanksDataUri: branding.thanksImageDataUri } : {}),
    ...(branding.imageMask ? { imageMask: branding.imageMask } : {}),
    ...(branding.coverDesign ? { coverDesign: branding.coverDesign } : {}),
    pricing: null,
    signature: {
      svgMarkup:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 64"><path d="M8 42 C 28 8, 46 58, 78 30 S 130 8, 188 34" fill="none" stroke="#141816" stroke-width="2.4" stroke-linecap="round"/></svg>',
      customerName: demo?.customer ?? 'Sample customer',
      signedAt: EXAMPLE_DATE,
    },
    generatedAt: EXAMPLE_DATE,
    template,
  };
  return buildReportPreviewHtml(input);
}
