/**
 * Per-job checklist driven by a named template (Figma Field Proof · 05).
 * Items are stored on the job so progress survives restarts and can print in the PDF.
 */

export type JobChecklistTemplateId = 'boiler' | 'bathroom' | 'eicr' | 'roof' | 'custom';

export type JobChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type JobChecklist = {
  jobId: string;
  templateId: JobChecklistTemplateId;
  includeInPdf: boolean;
  items: JobChecklistItem[];
  updatedAt: string;
};

export type JobChecklistTemplate = {
  id: JobChecklistTemplateId;
  name: string;
  items: string[];
};

export const JOB_CHECKLIST_TEMPLATES: JobChecklistTemplate[] = [
  {
    id: 'boiler',
    name: 'Boiler Service',
    items: [
      'Visual inspection of boiler & flue',
      'Gas pressure & flow rate tested',
      'Flue gas analysis — CO/CO2 in range',
      'Condensate pipe checked & cleared',
      'Pressure topped up to 1.2 bar',
      'Customer sign-off & handover',
    ],
  },
  {
    id: 'bathroom',
    name: 'Bathroom Fit',
    items: [
      'Isolate water & protect floors',
      'Remove existing suite',
      'Fit new bath / shower tray',
      'Install WC and basin',
      'Tile / seal wet areas',
      'Commission and customer handover',
    ],
  },
  {
    id: 'eicr',
    name: 'EICR Check',
    items: [
      'Visual inspection of installation',
      'Continuity of protective conductors',
      'Insulation resistance tested',
      'Polarity and RCD checks',
      'Schedule of inspections completed',
      'Certificate issued to customer',
    ],
  },
  {
    id: 'roof',
    name: 'Roof Repair',
    items: [
      'Site access and safety set up',
      'Inspect damaged area',
      'Remove and replace defective tiles',
      'Check flashings and valleys',
      'Clear gutters / downpipes',
      'Final inspection with customer',
    ],
  },
];

export function checklistTemplateById(id: JobChecklistTemplateId): JobChecklistTemplate | undefined {
  return JOB_CHECKLIST_TEMPLATES.find((template) => template.id === id);
}

export function buildChecklistItems(labels: string[], idFactory: () => string): JobChecklistItem[] {
  return labels.map((label) => ({ id: idFactory(), label, checked: false }));
}

export function checklistProgress(items: JobChecklistItem[]): { checked: number; total: number; percent: number } {
  const total = items.length;
  const checked = items.filter((item) => item.checked).length;
  const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
  return { checked, total, percent };
}

export function parseChecklistItems(raw: string | null | undefined): JobChecklistItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const row = entry as Record<string, unknown>;
        if (typeof row.id !== 'string' || typeof row.label !== 'string') return null;
        return {
          id: row.id,
          label: row.label.slice(0, 200),
          checked: Boolean(row.checked),
        };
      })
      .filter((item): item is JobChecklistItem => item !== null);
  } catch {
    return [];
  }
}

export function serializeChecklistItems(items: JobChecklistItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      label: item.label.slice(0, 200),
      checked: Boolean(item.checked),
    }))
  );
}

export function normalizeChecklistTemplateId(value: unknown): JobChecklistTemplateId {
  if (value === 'bathroom' || value === 'eicr' || value === 'roof' || value === 'custom' || value === 'boiler') {
    return value;
  }
  return 'boiler';
}
