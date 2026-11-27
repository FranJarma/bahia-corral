import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import type { AdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export type AdminInquiry = {
  id: string;
  contact_name: string;
  email: string;
  phone: string;
  event_type: string;
  preferred_date: string | null;
  guests_count: number | null;
  notes: string | null;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
};
const schema = z.object({
  contactName: z.string().trim().min(1).max(150),
  email: z.email(),
  phone: z.string().trim().min(6).max(40),
  eventType: z.string().trim().min(1).max(100),
  preferredDate: z.union([z.iso.date(), z.literal('')]),
  guestsCount: z.number().int().min(1).max(10000).nullable(),
  notes: z.string().trim().max(3000),
  status: z.enum(['NEW', 'CONTACTED', 'CLOSED']),
});
export async function listAdminInquiries(actor: AdminActor) {
  requirePermission(actor.role, 'events:manage');
  return runTenantTx(
    { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
    async (tx) =>
      resultRows<AdminInquiry>(
        await tx.execute(
          sql`SELECT id,contact_name,email,phone,event_type,preferred_date::text,guests_count,notes,status FROM event_inquiries WHERE tenant_id=${actor.tenantId} ORDER BY created_at DESC LIMIT 250`,
        ),
      ),
  );
}
export async function saveInquiry(actor: AdminActor, raw: unknown, id?: string) {
  requirePermission(actor.role, 'events:manage');
  const ctx = { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' as const };
  return runTenantTx(ctx, async (tx) => {
    const old = id
      ? resultRows<AdminInquiry>(
          await tx.execute(
            sql`SELECT id,contact_name,email,phone,event_type,preferred_date::text,guests_count,notes,status FROM event_inquiries WHERE tenant_id=${actor.tenantId} AND id=${id} FOR UPDATE`,
          ),
        )[0]
      : undefined;
    if (id && !old) throw new Error('La consulta de evento no está disponible.');
    const previous = old
      ? {
          contactName: old.contact_name,
          email: old.email,
          phone: old.phone,
          eventType: old.event_type,
          preferredDate: old.preferred_date ?? '',
          guestsCount: old.guests_count,
          notes: old.notes ?? '',
          status: old.status,
        }
      : { preferredDate: '', guestsCount: null, notes: '', status: 'NEW' };
    const data = schema.parse({ ...previous, ...schema.partial().parse(raw) });
    const eventId = id ?? randomUUID();
    if (id)
      await tx.execute(
        sql`UPDATE event_inquiries SET contact_name=${data.contactName},email=${data.email.toLowerCase()},phone=${data.phone},event_type=${data.eventType},preferred_date=${data.preferredDate || null}::date,guests_count=${data.guestsCount},notes=${data.notes || null},status=${data.status} WHERE tenant_id=${actor.tenantId} AND id=${id}`,
      );
    else
      await tx.execute(
        sql`INSERT INTO event_inquiries(id,tenant_id,contact_name,email,phone,event_type,preferred_date,guests_count,notes,status) VALUES(${eventId},${actor.tenantId},${data.contactName},${data.email.toLowerCase()},${data.phone},${data.eventType},${data.preferredDate || null}::date,${data.guestsCount},${data.notes || null},${data.status})`,
      );
    await appendAuditEvent(tx, {
      ...ctx,
      entity: 'event_inquiry',
      entityId: eventId,
      action: id ? 'EVENT_INQUIRY_UPDATED' : 'EVENT_INQUIRY_CREATED',
      correlationId: randomUUID(),
    });
    return { id: eventId };
  });
}
