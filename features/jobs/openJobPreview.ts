import type { JobDocumentSummary } from '@/database/repositories/documentsRepository';
import { DOCUMENT_KINDS, type DocumentKind } from '@/models';

export type JobPreviewRoute =
  | { type: 'reportPreview'; jobId: string }
  | { type: 'document'; documentId: string }
  | { type: 'jobChecklist'; jobId: string };

/**
 * Where a Jobs-list card should open.
 * Prefer the active segment when that document exists; otherwise the newest doc.
 * Jobs with no documents yet (typical new report) open the guided checklist.
 */
export function resolveJobPreviewRoute(
  jobId: string,
  summary: JobDocumentSummary | null | undefined,
  preferredKind: DocumentKind | null = null
): JobPreviewRoute {
  // Explicit report segment with no report yet → keep building via checklist.
  if (preferredKind === 'report' && !summary?.report) {
    return { type: 'jobChecklist', jobId };
  }

  if (preferredKind && summary?.[preferredKind]) {
    return routeForKind(jobId, preferredKind, summary[preferredKind]!.id);
  }

  const newest = newestDocument(summary);
  if (!newest) return { type: 'jobChecklist', jobId };
  return routeForKind(jobId, newest.kind, newest.id);
}

function routeForKind(jobId: string, kind: DocumentKind, documentId: string): JobPreviewRoute {
  if (kind === 'report') return { type: 'reportPreview', jobId };
  return { type: 'document', documentId };
}

function newestDocument(
  summary: JobDocumentSummary | null | undefined
): { kind: DocumentKind; id: string; updatedAt: string } | null {
  if (!summary) return null;
  let best: { kind: DocumentKind; id: string; updatedAt: string } | null = null;
  for (const kind of DOCUMENT_KINDS) {
    const entry = summary[kind];
    if (!entry) continue;
    if (!best || entry.updatedAt > best.updatedAt) {
      best = { kind, id: entry.id, updatedAt: entry.updatedAt };
    }
  }
  return best;
}
