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
  isQuick: false,
  customerId: null,
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
    // Title alone unlocks Create PDF; work steps remain optional.
    expect(ctaForGuidedState(state)).toEqual({ stepId: 'report', kind: 'create' });
  });

  it('unlocks Create PDF as soon as the job has a title — work steps stay optional', () => {
    const withTitleOnly = computeGuidedChecklist({
      job: baseJob,
      photoCounts: { before: 0, during: 0, after: 0 },
      summary: null,
      hasSignature: false,
      checklist: null,
      isPro: false,
    });
    expect(withTitleOnly.canCreatePdf).toBe(true);
    expect(ctaForGuidedState(withTitleOnly)).toEqual({ stepId: 'report', kind: 'create' });

    const emptyTitle = computeGuidedChecklist({
      job: { ...baseJob, title: '   ' },
      photoCounts: { before: 0, during: 0, after: 0 },
      summary: null,
      hasSignature: false,
      checklist: null,
      isPro: false,
    });
    expect(emptyTitle.canCreatePdf).toBe(false);
  });
});
