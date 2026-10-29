import { ReportTemplateId } from '@/models';

export type ReportTemplateOption = {
  id: ReportTemplateId;
  label: string;
  hint: string;
  description: string;
};

export const REPORT_TEMPLATES: ReportTemplateOption[] = [
  {
    id: 'trade',
    label: 'Trade Pack',
    hint: 'Cover to close',
    description: 'A cover, the job and scope of work, before and after photos, sign-off, and a thank-you page.',
  },
  {
    id: 'modern',
    label: 'Modern Clean',
    hint: 'Plain letterhead',
    description: 'A plain letterhead with the customer, the work, and the photos. No cover page.',
  },
  {
    id: 'image',
    label: 'Image Led',
    hint: 'Photos first',
    description: 'A cover, then the project overview and large photos of the whole job.',
  },
  {
    id: 'side',
    label: 'Side Navigation',
    hint: 'Numbered',
    description: 'A cover, then job details on the left and the work, photos and sign-off numbered on the right.',
  },
  {
    id: 'cards',
    label: 'Card Layout',
    hint: 'Plain cards',
    description: 'A plain page with the customer, date and reference in boxes, then the photos.',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    hint: 'Plain page',
    description: 'A plain page: the job, the photos, and the summary. No cover page.',
  },
  {
    id: 'dark',
    label: 'Dark Header',
    hint: 'Bold',
    description: 'A cover, then a black header, the notes in columns, and a strip of every photo.',
  },
];

export function reportTemplateLabel(id: ReportTemplateId): string {
  return REPORT_TEMPLATES.find((template) => template.id === id)?.label ?? 'Modern Clean';
}
