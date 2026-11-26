import { resolveJobPreviewRoute } from './openJobPreview';

describe('resolveJobPreviewRoute', () => {
  const summary = {
    quote: { id: 'q1', status: 'sent' as const, updatedAt: '2026-01-01T10:00:00.000Z' },
    report: { id: 'r1', status: 'draft' as const, updatedAt: '2026-01-02T10:00:00.000Z' },
    invoice: null,
  };

  it('opens the guided checklist when the job has no documents', () => {
    expect(resolveJobPreviewRoute('job-1', null)).toEqual({
      type: 'jobChecklist',
      jobId: 'job-1',
    });
  });

  it('opens report preview for the newest document when it is a report', () => {
    expect(resolveJobPreviewRoute('job-1', summary)).toEqual({
      type: 'reportPreview',
      jobId: 'job-1',
    });
  });

  it('honours the preferred segment when that document exists', () => {
    expect(resolveJobPreviewRoute('job-1', summary, 'quote')).toEqual({
      type: 'document',
      documentId: 'q1',
    });
  });

  it('falls back when the preferred segment has no document', () => {
    expect(resolveJobPreviewRoute('job-1', summary, 'invoice')).toEqual({
      type: 'reportPreview',
      jobId: 'job-1',
    });
  });
});
