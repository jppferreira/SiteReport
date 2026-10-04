import { getDatabase } from '@/database/client';
import { Signature } from '@/models';

function rowToSignature(row: Record<string, unknown>): Signature {
  return {
    jobId: row.jobId as string,
    customerName: (row.customerName as string | null) ?? null,
    localSignatureUri: row.localSignatureUri as string,
    width: row.width as number,
    height: row.height as number,
    signedAt: row.signedAt as string,
  };
}

export async function getSignature(jobId: string): Promise<Signature | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM signatures WHERE jobId = ?', [
    jobId,
  ]);
  return row ? rowToSignature(row) : null;
}

export async function saveSignature(signature: Signature): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO signatures (jobId, customerName, localSignatureUri, width, height, signedAt)
     VALUES ($jobId, $customerName, $localSignatureUri, $width, $height, $signedAt)
     ON CONFLICT(jobId) DO UPDATE SET
       customerName = excluded.customerName,
       localSignatureUri = excluded.localSignatureUri,
       width = excluded.width,
       height = excluded.height,
       signedAt = excluded.signedAt`,
    {
      $jobId: signature.jobId,
      $customerName: signature.customerName,
      $localSignatureUri: signature.localSignatureUri,
      $width: signature.width,
      $height: signature.height,
      $signedAt: signature.signedAt,
    }
  );
}

export async function deleteSignature(jobId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM signatures WHERE jobId = ?', [jobId]);
}
