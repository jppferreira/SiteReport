/**
 * Child rows that belong to a job. `jobs` is deleted last so a parent row
 * is never removed while its photos, notes, signature, or reports remain.
 * photo_areas has no foreign key, so it has to be listed here explicitly.
 */
export const JOB_CHILD_TABLES = ['photos', 'photo_areas', 'work_summaries', 'signatures', 'reports'] as const;

export function deleteJobStatements(): string[] {
  return [
    ...JOB_CHILD_TABLES.map((table) => `DELETE FROM ${table} WHERE jobId = ?`),
    'DELETE FROM jobs WHERE id = ?',
  ];
}

/** Removes rows left behind by deletes that ran before foreign keys were on. */
export function orphanCleanupStatements(): string[] {
  return JOB_CHILD_TABLES.map((table) => `DELETE FROM ${table} WHERE jobId NOT IN (SELECT id FROM jobs)`);
}
