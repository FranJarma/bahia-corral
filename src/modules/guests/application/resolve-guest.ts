import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { resultRows, type TenantTx } from '@/infrastructure/db/tenant-transaction';
import { type GuestContact, normalizeGuestContact } from '@/modules/guests/domain/guest-contact';

/** El correo identifica el contacto, pero nunca autoriza acceso a su reserva. */
export async function findGuestByContact(tx: TenantTx, tenantId: string, contact: GuestContact) {
  const clean = normalizeGuestContact(contact);
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId + ':guest:' + clean.identity},0))`,
  );
  const [guest] = resultRows<{ id: string }>(
    await tx.execute(sql`
    SELECT id FROM guests WHERE tenant_id=${tenantId} AND merged_into_id IS NULL
    AND ${
      clean.email
        ? sql`lower(btrim(email))=${clean.email}`
        : sql`NULLIF(btrim(email),'') IS NULL AND regexp_replace(phone,'[^0-9]','','g')=${clean.phoneDigits}
        AND lower(regexp_replace(btrim(first_name),'[[:space:]]+',' ','g'))=${clean.firstName.toLowerCase()}
        AND lower(regexp_replace(btrim(last_name),'[[:space:]]+',' ','g'))=${clean.lastName.toLowerCase()}`
    }
    ORDER BY created_at,id LIMIT 1`),
  );
  return guest ?? null;
}

export async function resolveGuest(tx: TenantTx, tenantId: string, contact: GuestContact) {
  const existing = await findGuestByContact(tx, tenantId, contact);
  if (existing) return existing.id;
  const clean = normalizeGuestContact(contact),
    id = randomUUID();
  await tx.execute(sql`INSERT INTO guests(id,tenant_id,first_name,last_name,phone,email)
    VALUES(${id},${tenantId},${clean.firstName},${clean.lastName},${clean.phone},${clean.email})`);
  return id;
}
