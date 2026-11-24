import { createHash } from 'node:crypto';
import {randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {resultRows,runTenantTx,type TenantContext} from '@/infrastructure/db/tenant-transaction';
import {createMercadoPagoGateway} from '@/modules/payments/integrations/mercadopago';

export async function createPaymentRequest(ctx:TenantContext,input:{reservationId:string;purpose:'DEPOSIT'|'FULL'|'BALANCE';checkoutToken:string}){
  const record=await runTenantTx(ctx,async tx=>{
    const [reservation]=resultRows<{reference:string;quote_id:string;status:string;deposit_cents:string;amount_cents:string;email:string|null}>(await tx.execute(sql`
      SELECT r.reference,r.quote_id,r.status,q.deposit_cents::text,q.amount_cents::text,g.email
      FROM reservations r JOIN stay_quotes q ON q.tenant_id=r.tenant_id AND q.id=r.quote_id
      JOIN guests g ON g.tenant_id=r.tenant_id AND g.id=r.guest_id
      WHERE r.tenant_id=${ctx.tenantId} AND r.id=${input.reservationId} FOR UPDATE OF r`));
    if(!reservation||!reservation.email)throw new Error('La reserva necesita un correo válido para pagar online');
    const hashed=createHash('sha256').update(input.checkoutToken).digest('hex');
    const [hold]=resultRows<{id:string;status:string;expires_at:Date}>(await tx.execute(sql`
      SELECT id,status,expires_at FROM reservation_holds
      WHERE tenant_id=${ctx.tenantId} AND reservation_id=${input.reservationId}
      AND checkout_token_hash=${hashed} FOR UPDATE`));
    if (!hold || !['ACTIVE','VERIFYING','UNCERTAIN'].includes(hold.status)) {
      throw new Error('El checkout ya no está disponible');
    }
    if (hold.status==='ACTIVE' && new Date(hold.expires_at).getTime()<Date.now()) {
      throw new Error('El checkout venció antes de iniciar el pago');
    }
    // Bloqueo de conciliación: la consulta a Mercado Pago puede finalizar después del décimo minuto.
    await tx.execute(sql`UPDATE reservation_holds SET status='VERIFYING',payment_started_at=COALESCE(payment_started_at,now()),
      verification_deadline=COALESCE(verification_deadline,expires_at+interval '5 minutes')
      WHERE tenant_id=${ctx.tenantId} AND id=${hold.id}`);
    if(!['PENDING_CONFIRMATION','CONFIRMED'].includes(reservation.status))throw new Error('La reserva ya no permite este cobro');
    const [paid]=resultRows<{total:string}>(await tx.execute(sql`SELECT COALESCE(SUM(amount_cents),0)::text AS total FROM payments WHERE tenant_id=${ctx.tenantId} AND reservation_id=${input.reservationId}`));
    const remaining=BigInt(reservation.amount_cents)-BigInt(paid.total);
    const amount=input.purpose==='FULL'||input.purpose==='BALANCE'?remaining:BigInt(reservation.deposit_cents)-BigInt(paid.total);
    if(amount<=0n)throw new Error('El importe requerido ya se encuentra cubierto');
    const requestId=randomUUID();
    await tx.execute(sql`INSERT INTO payment_requests(id,tenant_id,reservation_id,quote_id,amount_cents,purpose)
      VALUES(${requestId},${ctx.tenantId},${input.reservationId},${reservation.quote_id},${amount.toString()},${input.purpose})`);
    return {requestId,reference:reservation.reference,email:reservation.email,amount,quoteId:reservation.quote_id};
  });
  // No retener una transacción PostgreSQL mientras se espera un proveedor externo.
  const external=await createMercadoPagoGateway().createCheckout({
    idempotencyKey:record.requestId,reservationReference:record.reference,email:record.email,
    amountCents:record.amount,description:`Reserva ${record.reference} — Bahía Corral`,
  });
  await runTenantTx(ctx,async tx=>{
    await tx.execute(sql`UPDATE payment_requests SET provider_order_id=${external.id},checkout_url=${external.checkoutUrl},status='CREATED' WHERE tenant_id=${ctx.tenantId} AND id=${record.requestId}`);
  });
  return {requestId:record.requestId,checkoutUrl:external.checkoutUrl};
}
