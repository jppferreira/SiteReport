import { deleteJobStatements, JOB_CHILD_TABLES, orphanCleanupStatements } from './jobDelete';

describe('job delete', () => {
  it('removes every child table before the job row', () => {
    const statements = deleteJobStatements();
    expect(statements).toEqual([
      'DELETE FROM photos WHERE jobId = ?',
      'DELETE FROM photo_areas WHERE jobId = ?',
      'DELETE FROM work_summaries WHERE jobId = ?',
      'DELETE FROM signatures WHERE jobId = ?',
      'DELETE FROM reports WHERE jobId = ?',
      'DELETE FROM jobs WHERE id = ?',
    ]);
    expect(statements.at(-1)).toContain('DELETE FROM jobs');
  });

  it('cleans the same child tables when a job row is already gone', () => {
    const statements = orphanCleanupStatements();
    expect(statements).toHaveLength(JOB_CHILD_TABLES.length);
    for (const table of JOB_CHILD_TABLES) {
      expect(statements).toContain(`DELETE FROM ${table} WHERE jobId NOT IN (SELECT id FROM jobs)`);
    }
    expect(statements.join('\n')).not.toContain('DELETE FROM jobs');
  });
});
