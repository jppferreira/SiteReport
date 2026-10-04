import { getDatabase } from '@/database/client';
import { BusinessProfile, DEFAULT_BUSINESS_PROFILE } from '@/models';

function rowToProfile(row: Record<string, unknown>): BusinessProfile {
  return {
    businessName: (row.businessName as string | null) ?? null,
    logoUri: (row.logoUri as string | null) ?? null,
    ownerName: (row.ownerName as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    registrationNumber: (row.registrationNumber as string | null) ?? null,
    vatNumber: (row.vatNumber as string | null) ?? null,
    accentColor: (row.accentColor as string | null) ?? null,
    footerMessage: (row.footerMessage as string | null) ?? null,
    updatedAt: row.updatedAt as string,
  };
}

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM business_profile WHERE id = 1');
  return row ? rowToProfile(row) : DEFAULT_BUSINESS_PROFILE;
}

export async function saveBusinessProfile(patch: Partial<Omit<BusinessProfile, 'updatedAt'>>): Promise<BusinessProfile> {
  const db = await getDatabase();
  const existing = await getBusinessProfile();
  const next: BusinessProfile = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO business_profile
       (id, businessName, logoUri, ownerName, email, phone, website, address, registrationNumber, vatNumber, accentColor, footerMessage, updatedAt)
     VALUES (1, $businessName, $logoUri, $ownerName, $email, $phone, $website, $address, $registrationNumber, $vatNumber, $accentColor, $footerMessage, $updatedAt)
     ON CONFLICT(id) DO UPDATE SET
       businessName = excluded.businessName,
       logoUri = excluded.logoUri,
       ownerName = excluded.ownerName,
       email = excluded.email,
       phone = excluded.phone,
       website = excluded.website,
       address = excluded.address,
       registrationNumber = excluded.registrationNumber,
       vatNumber = excluded.vatNumber,
       accentColor = excluded.accentColor,
       footerMessage = excluded.footerMessage,
       updatedAt = excluded.updatedAt`,
    {
      $businessName: next.businessName,
      $logoUri: next.logoUri,
      $ownerName: next.ownerName,
      $email: next.email,
      $phone: next.phone,
      $website: next.website,
      $address: next.address,
      $registrationNumber: next.registrationNumber,
      $vatNumber: next.vatNumber,
      $accentColor: next.accentColor,
      $footerMessage: next.footerMessage,
      $updatedAt: next.updatedAt,
    }
  );

  return next;
}
