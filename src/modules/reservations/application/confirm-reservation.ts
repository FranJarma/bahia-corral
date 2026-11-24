import { sql } from 'drizzle-orm';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import { resultRows, runTenantTx, type TenantContext } from '@/infrastructure/db/tenant-transaction';
import { requirePermission, type ActorRole } from '@/modules/identity-access/domain/permissions';

export type ConfirmInput={reservationId:string; exceptional?:{reason:string;role:ActorRole}};
/** Confirmación financiera y excepción administrativa comparten la conversión atómica de allocation. */
export async function confirmReservation(ctx:TenantContext,input:ConfirmInput):Promise<void>{
  if(input.exceptional){
    requirePermission(input.exceptional.role,'reservations:exception');
    if(!input.exceptional.reason.trim())throw new Error('La confirmación sin seña necesita motivo');
  }
  await runTenantTx(ctx,async tx=>{
    const [reservation]=resultRows<{status:string;quote_id:string}>(await tx.execute(sql`
      SELECT status,quote_id FROM reservations WHERE tenant_id=${ctx.tenantId} AND id=${input.reservationId} FOR UPDATE`));
    if(!reservation)throw new Error('Reserva inexistente');
    if(reservation.status==='CONFIRMED')return;
    if(reservation.status!=='PENDING_CONFIRMATION')throw new Error('La reserva no puede confirmarse en este estado');
    const [quote]=resultRows<{deposit_cents:string}>(await tx.execute(sql`SELECT deposit_cents FROM stay_quotes WHERE tenant_id=${ctx.tenantId} AND id=${reservation.quote_id}`));
    const [paid]=resultRows<{total:string}>(await tx.execute(sql`SELECT COALESCE(SUM(amount_cents),0)::text AS total FROM payments WHERE tenant_id=${ctx.tenantId} AND reservation_id=${input.reservationId}`));
    if(!input.exceptional&&BigInt(paid.total)<BigInt(quote.deposit_cents))throw new Error('La seña requerida todavía no está cubierta');
    const [hold]=resultRows<{id:string;status:string}>(await tx.execute(sql`SELECT id,status FROM reservation_holds WHERE tenant_id=${ctx.tenantId} AND reservation_id=${input.reservationId} FOR UPDATE`));
    if(!hold)throw new Error('No encontramos bloqueo asociado a la reserva');
    if(hold.status==='REJECTED'||hold.status==='EXPIRED')throw new Error('El bloqueo ya venció');
    const [allocation]=resultRows<{id:string}>(await tx.execute(sql`SELECT id FROM inventory_allocations WHERE tenant_id=${ctx.tenantId} AND hold_id=${hold.id} AND active=true FOR UPDATE`));
    if(!allocation)throw new Error('La disponibilidad protegida ya no existe');
    await tx.execute(sql`UPDATE inventory_allocations SET reason='RESERVATION',reservation_id=${input.reservationId},hold_id=NULL,updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${allocation.id}`);
    await tx.execute(sql`UPDATE reservation_holds SET status='CONVERTED' WHERE tenant_id=${ctx.tenantId} AND id=${hold.id}`);
    await tx.execute(sql`UPDATE reservations SET status='CONFIRMED',exceptional_confirmation=${Boolean(input.exceptional)},exceptional_reason=${input.exceptional?.reason??null},updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${input.reservationId}`);
    await appendAuditEvent(tx,{tenantId:ctx.tenantId,actorId:ctx.actorId,actorType:ctx.actorType,entity:'reservation',entityId:input.reservationId,action:input.exceptional?'CONFIRMED_WITHOUT_DEPOSIT':'CONFIRMED',reason:input.exceptional?.reason,correlationId:input.reservationId});
  });
}
