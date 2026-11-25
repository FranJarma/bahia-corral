import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import type { AdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export type AdminGuest={id:string;first_name:string;last_name:string;phone:string;email:string|null};
const schema=z.object({firstName:z.string().trim().min(1).max(100),lastName:z.string().trim().min(1).max(100),phone:z.string().trim().min(6).max(40),email:z.union([z.email(),z.literal('')])});
export async function listAdminGuests(actor:AdminActor) {
  requirePermission(actor.role,'reservations:read');
  return runTenantTx({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},async tx=>resultRows<AdminGuest>(await tx.execute(sql`SELECT id,first_name,last_name,phone,email FROM guests WHERE tenant_id=${actor.tenantId} ORDER BY created_at DESC LIMIT 250`)));
}
export async function saveGuest(actor:AdminActor,raw:unknown,id?:string) {
  requirePermission(actor.role,'reservations:write');
  const ctx={tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER' as const};
  return runTenantTx(ctx,async tx=>{
    const old=id ? resultRows<AdminGuest>(await tx.execute(sql`SELECT id,first_name,last_name,phone,email FROM guests WHERE tenant_id=${actor.tenantId} AND id=${id} FOR UPDATE`))[0] : undefined;
    if(id&&!old)throw new Error('El huésped no está disponible.');
    const previous=old?{firstName:old.first_name,lastName:old.last_name,phone:old.phone,email:old.email??''}:{email:''};
    const data=schema.parse({...previous,...schema.partial().parse(raw)});
    const guestId=id??randomUUID(), email=data.email.toLowerCase()||null;
    if(id) await tx.execute(sql`UPDATE guests SET first_name=${data.firstName},last_name=${data.lastName},phone=${data.phone},email=${email} WHERE tenant_id=${actor.tenantId} AND id=${id}`);
    else await tx.execute(sql`INSERT INTO guests(id,tenant_id,first_name,last_name,phone,email) VALUES(${guestId},${actor.tenantId},${data.firstName},${data.lastName},${data.phone},${email})`);
    await appendAuditEvent(tx,{...ctx,entity:'guest',entityId:guestId,action:id?'GUEST_UPDATED':'GUEST_CREATED',correlationId:randomUUID()});
    return {id:guestId};
  });
}
