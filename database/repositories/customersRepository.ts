import type { SQLiteBindValue } from 'expo-sqlite';

import { getDatabase } from '@/database/client';
import type { Customer, CustomerDraft } from '@/models';
import { generateId } from '@/utils/id';

function rowToCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    postcode: (row.postcode as string | null) ?? null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function createCustomer(draft: CustomerDraft): Promise<Customer> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const customer: Customer = {
    id: generateId(),
    name: draft.name.trim(),
    phone: draft.phone?.trim() || null,
    email: draft.email?.trim() || null,
    address: draft.address?.trim() || null,
    postcode: draft.postcode?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO customers (id, name, phone, email, address, postcode, createdAt, updatedAt)
     VALUES ($id, $name, $phone, $email, $address, $postcode, $createdAt, $updatedAt)`,
    {
      $id: customer.id,
      $name: customer.name,
      $phone: customer.phone,
      $email: customer.email,
      $address: customer.address,
      $postcode: customer.postcode,
      $createdAt: customer.createdAt,
      $updatedAt: customer.updatedAt,
    }
  );

  return customer;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM customers WHERE id = ?', id);
  return row ? rowToCustomer(row) : null;
}

export async function listRecentCustomers(limit = 20): Promise<Customer[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM customers ORDER BY updatedAt DESC LIMIT ?',
    limit
  );
  return rows.map(rowToCustomer);
}

export async function searchCustomers(search = '', limit = 30): Promise<Customer[]> {
  const db = await getDatabase();
  const trimmed = search.trim();
  if (trimmed.length === 0) {
    return listRecentCustomers(limit);
  }
  const params: Record<string, SQLiteBindValue> = { $search: `%${trimmed}%`, $limit: limit };
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM customers
     WHERE name LIKE $search OR email LIKE $search OR phone LIKE $search OR address LIKE $search OR postcode LIKE $search
     ORDER BY updatedAt DESC LIMIT $limit`,
    params
  );
  return rows.map(rowToCustomer);
}

export async function updateCustomer(id: string, patch: Partial<CustomerDraft>): Promise<void> {
  const db = await getDatabase();
  const existing = await getCustomer(id);
  if (!existing) return;

  const next: Customer = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone.trim() || null } : {}),
    ...(patch.email !== undefined ? { email: patch.email.trim() || null } : {}),
    ...(patch.address !== undefined ? { address: patch.address.trim() || null } : {}),
    ...(patch.postcode !== undefined ? { postcode: patch.postcode.trim() || null } : {}),
    updatedAt: new Date().toISOString(),
  };

  await db.runAsync(
    `UPDATE customers SET name=$name, phone=$phone, email=$email, address=$address, postcode=$postcode, updatedAt=$updatedAt
     WHERE id=$id`,
    {
      $id: next.id,
      $name: next.name,
      $phone: next.phone,
      $email: next.email,
      $address: next.address,
      $postcode: next.postcode,
      $updatedAt: next.updatedAt,
    }
  );
}