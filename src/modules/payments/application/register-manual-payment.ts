import {sql} from 'drizzle-orm';
import {appendAuditEvent} from '@/infrastructure/audit/append-audit-event';
import {resultRows,runTenantTx,type TenantContext} from '@/infrastructure/db/tenant-transaction';
import {requirePermission,type ActorRole} from '@/modules/identity-access/domain/permissions';

export async function registerManualPayment(ctx:TenantContext,role:ActorRole,input:{reservationId:string;amountCents:bigint;method:'TRANSFER'|'CASH'|'DEBIT'|'CREDIT';reference?:string;idempotencyKey:string}){
  requirePermission(role,'payments:register');
  if(input.amountCents<=0n||!input.idempotencyKey)throw new Error('Pago inválido');
  return runTenantTx(ctx,async tx=>{
    const [reservation]=resultRows<{id:string}>(await tx.execute(sql`SELECT id FROM reservations WHERE tenant_id=${ctx.tenantId} AND id=${input.reservationId} FOR UPDATE`));
    if(!reservation)throw new Error('Reserva inexistente');
    const [saved]=resultRows<{id:string}>(await tx.execute(sql`
      INSERT INTO payments(tenant_id,reservation_id,amount_cents,method,provider,channel,manual_idempotency_key,verified_by)
      VALUES(${ctx.tenantId},${input.reservationId},${input.amountCents.toString()},${input.method},'MANUAL','MANUAL',${input.idempotencyKey},${ctx.actorId})
      ON CONFLICT(tenant_id,manual_idempotency_key) DO NOTHING RETURNING id`));
    if (!saved) {
      const [previous] = resultRows<{id:string;reservation_id:string}>(await tx.execute(sql`
        SELECT id,reservation_id FROM payments WHERE tenant_id=${ctx.tenantId} AND manual_idempotency_key=${input.idempotencyKey}`));
      if (!previous || previous.reservation_id !== input.reservationId) throw new Error('Conflicto de idempotencia');
      return {paymentId:previous.id};
    }
    await appendAuditEvent(tx,{tenantId:ctx.tenantId,actorId:ctx.actorId,actorType:ctx.actorType,entity:'payment',entityId:saved.id,action:'MANUAL_PAYMENT_RECORDED',reason:input.reference,correlationId:input.idempotencyKey});
    return {paymentId:saved.id};
  });
}
