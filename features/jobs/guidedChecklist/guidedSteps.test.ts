import { computeGuidedChecklist, ctaForGuidedState } from './guidedSteps';

const baseJob = {
  id: 'j1',
  title: 'Kitchen refit',
  customerName: null as string | null,
  address: '14 Oak Street, Bristol',
  jobDate: '2026-11-24',
  referenceNumber: null,
  description: null,
  status: 'draft' as const,
  coverPhotoId: null,
  createdAt: '2026-11-24T10:00:00.000Z',
  updatedAt: '2026-11-24T10:00:00.000Z',
};

describe('computeGuidedChecklist', () => {
  it('starts at 0/7 with job details up next when only a title exists', () => {
    const state = computeGuidedChecklist({
      job: baseJob,
      photoCounts: { before: 0, during: 0, after: 0 },
      summary: null,
      hasSignature: false,
      checklist: null,
      isPro: false,
    });

    expect(state.completedCount).toBe(0);
    expect(state.totalCount).toBe(7);
    expect(state.currentId).toBe('details');
    expect(state.steps[0]?.status).toBe('in_progress');
    expect(ctaForGuidedState(state)).toEqual({ stepId: 'details', kind: 'start' });
  });

  it('unlocks Create PDF only after details, before/after photos, and work notes', () => {
    const locked = computeGuidedChecklist({
      job: { ...baseJob, customerName: 'Sarah Mitchell' },
      photoCounts: { before: 8, during: 4, after: 0 },
      summary: {
        jobId: 'j1',
        workCompleted: 'Fitted units',
        materials: null,
        recommendations: null,
        notes: null,
        pricing: { enabled: false, lines: [] },
        documentType: 'reference',
        invoiceNumber: null,
        updatedAt: '2026-11-24T10:00:00.000Z',
      },
      hasSignature: false,
      checklist: null,
      isPro: false,
    });
    expect(locked.canCreatePdf).toBe(false);
    expect(locked.currentId).toBe('photos');

    const unlocked = computeGuidedChecklist({
      job: { ...baseJob, customerName: 'Sarah Mitchell' },
      photoCounts: { before: 8, during: 4, after: 2 },
      summary: {
        jobId: 'j1',
        workCompleted: 'Fitted units',
        materials: null,
        recommendations: null,
        notes: null,
        pricing: { enabled: false, lines: [] },
        documentType: 'reference',
        invoiceNumber: null,
        updatedAt: '2026-11-24T10:00:00.000Z',
      },
      hasSignature: false,
      checklist: null,
      isPro: false,
    });
    expect(unlocked.canCreatePdf).toBe(true);
  });
});
