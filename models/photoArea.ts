/**
 * A named part of a job, such as Kitchen or Bathroom.
 * Called an area in code so it stays distinct from the job workspace steps
 * (details, photos, summary, signature, report).
 */
export type PhotoArea = {
  id: string;
  jobId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

/** Route id for photos that cover the whole job. This value is never stored. */
export const WHOLE_JOB_AREA_ID = 'whole-job';

const MAX_AREA_NAME_LENGTH = 40;

export function normalizeAreaName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_AREA_NAME_LENGTH);
}

export function isWholeJobArea(areaId: string | null | undefined): boolean {
  return areaId === WHOLE_JOB_AREA_ID;
}
