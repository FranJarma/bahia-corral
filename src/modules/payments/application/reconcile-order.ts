import { sql } from 'drizzle-orm';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import {
  createMercadoPagoGateway,
  type VerifiedOrder,
} from '@/modules/payments/integrations/mercadopago';

/** Recibidor idempotente: ninguna notificación es prueba del dinero hasta consultar Orders API. */
export async function reconcileMercadoPagoOrder(
  ctx: TenantContext,
  orderId: string,
): Promise<'CONFIRMED' | 'PENDING' | 'REJECTED' | 'CONFLICT' | 'IGNORED'> {
  const provider = await createMercadoPagoGateway().getOrder(orderId);
  return applyVerifiedOrder(ctx, provider);
}

export async function applyVerifiedOrder(
  ctx: TenantContext,
  provider: VerifiedOrder,
): Promise<'CONFIRMED' | 'PENDING' | 'REJECTED' | 'CONFLICT' | 'IGNORED'> {
  return runTenantTx(ctx, async (tx) => {
    const [request] = resultRows<{
      id: string;
      reservation_id: string;
      amount_cents: string;
      status: string;
    }>(
      await tx.execute(sql`
      SELECT id,reservation_id,amount_cents,status FROM payment_requests
      WHERE tenant_id=${ctx.tenantId} AND provider='MERCADO_PAGO' AND provider_order_id=${provider.id} FOR UPDATE`),
    );
    if (!request) return 'IGNORED';
    const [reservation] = resultRows<{
      status: string;
      quote_id: string;
      unit_id: string;
      checkin: string;
      checkout: string;
    }>(
      await tx.execute(sql`
      SELECT status,quote_id,unit_id,checkin::text,checkout::text FROM reservations
      WHERE tenant_id=${ctx.tenantId} AND id=${request.reservation_id} FOR UPDATE`),
    );
    if (!reservation) return 'IGNORED';
    // Una notificación atrasada no puede degradar un cobro ya acreditado.
    if (request.status === 'APPROVED' && provider.status !== 'APPROVED') {
      if (reservation.status === 'CANCELLED') return 'CONFLICT';
      return reservation.status === 'PENDING_CONFIRMATION' ? 'PENDING' : 'CONFIRMED';
    }
    if (provider.status === 'PROCESSING' || provider.status === 'UNKNOWN') {
      await tx.execute(
        sql`UPDATE payment_requests SET status='PROCESSING' WHERE tenant_id=${ctx.tenantId} AND id=${request.id}`,
      );
      await tx.execute(sql`UPDATE reservation_holds SET status='VERIFYING',payment_started_at=COALESCE(payment_started_at,now()),
        verification_deadline=COALESCE(verification_deadline,expires_at+interval '5 minutes')
        WHERE tenant_id=${ctx.tenantId} AND reservation_id=${request.reservation_id} AND status='ACTIVE'`);
      return reservation.status === 'CANCELLED' ? 'CONFLICT' : 'PENDING';
    }
    if (provider.status === 'REJECTED') {
      await tx.execute(
        sql`UPDATE payment_requests SET status='REJECTED' WHERE tenant_id=${ctx.tenantId} AND id=${request.id}`,
      );
      if (reservation.status === 'PENDING_CONFIRMATION') {
        await tx.execute(
          sql`UPDATE reservation_holds SET status='REJECTED' WHERE tenant_id=${ctx.tenantId} AND reservation_id=${request.reservation_id} AND status IN ('ACTIVE','VERIFYING','UNCERTAIN')`,
        );
        await tx.execute(sql`UPDATE inventory_allocations SET active=false WHERE tenant_id=${ctx.tenantId} AND reservation_id IS NULL
          AND hold_id IN (SELECT id FROM reservation_holds WHERE tenant_id=${ctx.tenantId} AND reservation_id=${request.reservation_id})`);
        await tx.execute(
          sql`UPDATE reservations SET status='NOT_COMPLETED' WHERE tenant_id=${ctx.tenantId} AND id=${request.reservation_id}`,
        );
      }
      return 'REJECTED';
    }
    // El importe de la orden debe cubrir el solicitado. Los pagos parciales se cobran como requests diferentes.
    if (provider.amountCents !== BigInt(request.amount_cents)) {
      throw new Error('Monto de Mercado Pago inconsistente; necesita conciliación manual');
    }
    const paymentIdentity = provider.paymentId ?? provider.id;
    const saved = resultRows<{ id: string }>(
      await tx.execute(sql`
      INSERT INTO payments(tenant_id,reservation_id,request_id,amount_cents,method,provider,channel,external_id)
      VALUES(${ctx.tenantId},${request.reservation_id},${request.id},${provider.amountCents.toString()},
        ${provider.paymentMethod},'MERCADO_PAGO','WEB',${paymentIdentity})
      ON CONFLICT(provider,external_id) DO NOTHING RETURNING id`),
    );
    await tx.execute(
      sql`UPDATE payment_requests SET status='APPROVED' WHERE tenant_id=${ctx.tenantId} AND id=${request.id}`,
    );
    if (saved.length > 0) {
      await appendAuditEvent(tx, {
        tenantId: ctx.tenantId,
        actorId: 'mercadopago',
        actorType: 'PROVIDER',
        entity: 'payment',
        entityId: saved[0].id,
        action: 'PAYMENT_VERIFIED',
        correlationId: request.id,
      });
    }
    if (reservation.status === 'CANCELLED') {
      if (saved.length > 0) {
        await tx.execute(sql`INSERT INTO outbox_jobs(tenant_id,kind,entity_id,due_at,payload)
          VALUES(${ctx.tenantId},'PAYMENT_AFTER_CANCELLATION',${request.reservation_id},now(),
            ${JSON.stringify({ orderId: provider.id, paymentId: saved[0].id })}::jsonb)`);
        await appendAuditEvent(tx, {
          tenantId: ctx.tenantId,
          actorId: 'mercadopago',
          actorType: 'PROVIDER',
          entity: 'payment',
          entityId: saved[0].id,
          action: 'PAYMENT_AFTER_CANCELLATION',
          reason: 'Cobro acreditado después de la anulación; requiere revisión administrativa.',
          correlationId: request.id,
        });
      }
      return 'CONFLICT';
    }
    if (reservation.status !== 'PENDING_CONFIRMATION') return 'CONFIRMED';
    const [quote] = resultRows<{ deposit_cents: string }>(
      await tx.execute(
        sql`SELECT deposit_cents::text FROM stay_quotes WHERE tenant_id=${ctx.tenantId} AND id=${reservation.quote_id}`,
      ),
    );
    const [paid] = resultRows<{ total: string }>(
      await tx.execute(
        sql`SELECT COALESCE(SUM(amount_cents),0)::text AS total FROM payments WHERE tenant_id=${ctx.tenantId} AND reservation_id=${request.reservation_id}`,
      ),
    );
    if (BigInt(paid.total) < BigInt(quote.deposit_cents)) return 'PENDING';
    const [hold] = resultRows<{ id: string; status: string }>(
      await tx.execute(
        sql`SELECT id,status FROM reservation_holds WHERE tenant_id=${ctx.tenantId} AND reservation_id=${request.reservation_id} FOR UPDATE`,
      ),
    );
    const allocations = hold
      ? resultRows<{ id: string }>(
          await tx.execute(
            sql`SELECT id FROM inventory_allocations WHERE tenant_id=${ctx.tenantId} AND hold_id=${hold.id} AND active=true FOR UPDATE`,
          ),
        )
      : [];
    if (allocations[0]) {
      await tx.execute(
        sql`UPDATE inventory_allocations SET reason='RESERVATION',reservation_id=${request.reservation_id},hold_id=NULL,updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${allocations[0].id}`,
      );
    } else {
      // Una confirmación tardía sólo recupera ocupación si no hay conflicto GiST.
      const acquired = resultRows<{ id: string }>(
        await tx.execute(sql`INSERT INTO inventory_allocations(tenant_id,unit_id,checkin,checkout,reason,reservation_id)
        VALUES(${ctx.tenantId},${reservation.unit_id},${reservation.checkin}::date,${reservation.checkout}::date,'RESERVATION',${request.reservation_id})
        ON CONFLICT DO NOTHING RETURNING id`),
      );
      if (!acquired[0]) {
        await tx.execute(sql`INSERT INTO outbox_jobs(tenant_id,kind,entity_id,due_at,payload)
          VALUES(${ctx.tenantId},'PAYMENT_AVAILABILITY_CONFLICT',${request.reservation_id},now(),${JSON.stringify({ orderId: provider.id })}::jsonb)`);
        return 'CONFLICT';
      }
    }
    if (hold)
      await tx.execute(
        sql`UPDATE reservation_holds SET status='CONVERTED' WHERE tenant_id=${ctx.tenantId} AND id=${hold.id}`,
      );
    await tx.execute(
      sql`UPDATE reservations SET status='CONFIRMED',updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${request.reservation_id}`,
    );
    await tx.execute(sql`INSERT INTO outbox_jobs(tenant_id,kind,entity_id,due_at,payload) VALUES
      (${ctx.tenantId},'RESERVATION_CONFIRMED',${request.reservation_id},now(),'{}'::jsonb),
      (${ctx.tenantId},'BALANCE_REMINDER_48H',${request.reservation_id},greatest(now(),(${reservation.checkin}::date - interval '48 hours')),'{}'::jsonb),
      (${ctx.tenantId},'BALANCE_REMINDER_12H',${request.reservation_id},greatest(now(),(${reservation.checkin}::date - interval '12 hours')),'{}'::jsonb)`);
    await appendAuditEvent(tx, {
      tenantId: ctx.tenantId,
      actorId: 'mercadopago',
      actorType: 'PROVIDER',
      entity: 'reservation',
      entityId: request.reservation_id,
      action: 'CONFIRMED',
      correlationId: request.id,
    });
    return 'CONFIRMED';
  });
}
