import { ReportTemplateId } from '@/models';

export type ReportTemplateOption = {
  id: ReportTemplateId;
  label: string;
  hint: string;
  description: string;
};

/** Display order for the preview tray and branding picker — nicest layouts first. */
export const REPORT_TEMPLATES: ReportTemplateOption[] = [
  {
    id: 'studio',
    label: 'Editorial Studio',
    hint: 'Joinery',
    description: 'Cream editorial cover, before and after, materials and aftercare. Cormorant Garamond and DM Sans.',
  },
  {
    id: 'stone',
    label: 'Stone & Spa',
    hint: 'Bathrooms',
    description: 'Framed spa cover, waterproofing checks, before and after, and tile spec. Outfit and DM Sans.',
  },
  {
    id: 'clearline',
    label: 'Clearline Modern',
    hint: 'Glazing',
    description: 'Split architectural cover, U-value spec cards, before and after, and guarantee. Inter and DM Sans.',
  },
  {
    id: 'atelier',
    label: 'Atelier Swatch',
    hint: 'Decorating',
    description: 'Framed cover, colour swatches, room gallery, and prep coats. Instrument Serif and DM Sans.',
  },
  {
    id: 'botanical',
    label: 'Botanical Field',
    hint: 'Landscaping',
    description: 'Garden handover cover, transformation gallery, build notes and seasonal care. Newsreader and DM Sans.',
  },
  {
    id: 'field',
    label: 'Field Proof',
    hint: 'Roofing',
    description: 'Angled slate cover with GPS evidence, annotated photos, and a guarantee strip. Space Grotesk and Inter.',
  },
  {
    id: 'thermal',
    label: 'Thermal Spec',
    hint: 'Plumbing',
    description: 'Navy spine cover with gas-safe style readings, before and after, and a signed sign-off. Plus Jakarta Sans.',
  },
  {
    id: 'blueprint',
    label: 'Blueprint Pro',
    hint: 'Builders',
    description: 'Navy blueprint cover with stage bar, site photos, and title block. Space Grotesk and JetBrains Mono.',
  },
  {
    id: 'circuit',
    label: 'Circuit Grid',
    hint: 'Electrical',
    description: 'Dark grid cover, circuit test table, site photos, and materials. Space Grotesk and JetBrains Mono.',
  },
  {
    id: 'solaris',
    label: 'Solaris Clean',
    hint: 'Solar',
    description: 'Commissioning cover with yield KPIs, install photos, and MCS checklist. Plus Jakarta Sans and JetBrains Mono.',
  },
  {
    id: 'sentinel',
    label: 'Sentinel Precision',
    hint: 'Security',
    description: 'Dark command-centre cover with zone table, camera HUD views, and privacy handover. Inter and JetBrains Mono.',
  },
  {
    id: 'image',
    label: 'Image Led',
    hint: 'Photos first',
    description: 'A cover, then the project overview and large photos of the whole job.',
  },
  {
    id: 'dark',
    label: 'Dark Header',
    hint: 'Bold',
    description: 'A cover, then a black header, the notes in columns, and a strip of every photo.',
  },
  {
    id: 'trade',
    label: 'Trade Pack',
    hint: 'Cover to close',
    description: 'A cover, the job and scope of work, before and after photos, sign-off, and a thank-you page.',
  },
  {
    id: 'side',
    label: 'Side Navigation',
    hint: 'Numbered',
    description: 'A cover, then job details on the left and the work, photos and sign-off numbered on the right.',
  },
  {
    id: 'modern',
    label: 'Modern Clean',
    hint: 'Plain letterhead',
    description: 'A plain letterhead with the customer, the work, and the photos. No cover page.',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    hint: 'Plain page',
    description: 'A plain page: the job, the photos, and the summary. No cover page.',
  },
  {
    id: 'cards',
    label: 'Card Layout',
    hint: 'Plain cards',
    description: 'A plain page with the customer, date and reference in boxes, then the photos.',
  },
];

export function reportTemplateLabel(id: ReportTemplateId): string {
  return REPORT_TEMPLATES.find((template) => template.id === id)?.label ?? 'Modern Clean';
}
