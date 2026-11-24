import { sql } from 'drizzle-orm';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import { resultRows, runTenantTx, type TenantContext } from '@/infrastructure/db/tenant-transaction';
import { requirePermission, type ActorRole } from '@/modules/identity-access/domain/permissions';

export type RegisterManualPaymentInput = {
  reservationId: string;
  amountCents: bigint;
  method: 'TRANSFER' | 'CASH' | 'DEBIT' | 'CREDIT';
  reference?: string;
  idempotencyKey: string;
};

/** Acreditación manual: el registro y la eventual confirmación ocurren en una transacción. */
export async function registerManualPayment(
  ctx: TenantContext,
  role: ActorRole,
  input: RegisterManualPaymentInput,
): Promise<{ paymentId: string; confirmation: 'CONFIRMED' | 'PENDING' | 'CONFLICT' }> {
  requirePermission(role, 'payments:register');
  if (input.amountCents <= 0n || !input.idempotencyKey) throw new Error('Pago inválido');

  return runTenantTx(ctx, async (tx) => {
    const [reservation] = resultRows<{
      id: string;
      status: string;
      quote_id: string;
      checkin: string;
      checkout: string;
      unit_id: string;
    }>(
      await tx.execute(sql`SELECT id,status,quote_id,checkin::text,checkout::text,unit_id
        FROM reservations WHERE tenant_id=${ctx.tenantId} AND id=${input.reservationId} FOR UPDATE`),
    );
    if (!reservation) throw new Error('Reserva inexistente');
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(reservation.status)) {
      throw new Error('Una reserva cerrada necesita un procedimiento financiero específico');
    }

    const [saved] = resultRows<{ id: string }>(
      await tx.execute(sql`INSERT INTO payments
        (tenant_id,reservation_id,amount_cents,method,provider,channel,manual_idempotency_key,verified_by)
        VALUES(${ctx.tenantId},${input.reservationId},${input.amountCents.toString()},${input.method},
          'MANUAL','MANUAL',${input.idempotencyKey},${ctx.actorId})
        ON CONFLICT(tenant_id,manual_idempotency_key) DO NOTHING RETURNING id`),
    );

    if (!saved) {
      const [existing] = resultRows<{
        id: string;
        reservation_id: string;
        amount_cents: string;
        method: string;
      }>(
        await tx.execute(sql`SELECT id,reservation_id,amount_cents::text,method FROM payments
          WHERE tenant_id=${ctx.tenantId} AND manual_idempotency_key=${input.idempotencyKey}`),
      );
      if (
        !existing ||
        existing.reservation_id !== input.reservationId ||
        BigInt(existing.amount_cents) !== input.amountCents ||
        existing.method !== input.method
      ) {
        throw new Error('Conflicto de idempotencia: el reintento tiene datos diferentes');
      }
      return { paymentId: existing.id, confirmation: reservation.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING' };
    }

    await appendAuditEvent(tx, {
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorType: ctx.actorType,
      entity: 'payment',
      entityId: saved.id,
      action: 'MANUAL_PAYMENT_RECORDED',
      reason: input.reference,
      correlationId: input.idempotencyKey,
    });

    if (reservation.status !== 'PENDING_CONFIRMATION') {
      if (reservation.status === 'NOT_COMPLETED') {
        await tx.execute(sql`INSERT INTO outbox_jobs(tenant_id,kind,entity_id,due_at)
          VALUES (${ctx.tenantId},'LATE_MANUAL_PAYMENT',${input.reservationId},now())`);
      }
      return { paymentId: saved.id, confirmation: 'PENDING' };
    }

    const [quote] = resultRows<{ deposit_cents: string }>(
      await tx.execute(sql`SELECT deposit_cents::text FROM stay_quotes
        WHERE tenant_id=${ctx.tenantId} AND id=${reservation.quote_id}`),
    );
    const [total] = resultRows<{ paid_cents: string }>(
      await tx.execute(sql`SELECT COALESCE(SUM(amount_cents),0)::text AS paid_cents FROM payments
        WHERE tenant_id=${ctx.tenantId} AND reservation_id=${input.reservationId}`),
    );
    if (BigInt(total.paid_cents) < BigInt(quote.deposit_cents)) {
      return { paymentId: saved.id, confirmation: 'PENDING' };
    }

    const [hold] = resultRows<{ id: string }>(
      await tx.execute(sql`SELECT id FROM reservation_holds
        WHERE tenant_id=${ctx.tenantId} AND reservation_id=${input.reservationId} FOR UPDATE`),
    );
    const allocations = hold
      ? resultRows<{ id: string }>(
          await tx.execute(sql`SELECT id FROM inventory_allocations
            WHERE tenant_id=${ctx.tenantId} AND hold_id=${hold.id} AND active=true FOR UPDATE`),
        )
      : [];

    if (allocations[0]) {
      await tx.execute(sql`UPDATE inventory_allocations
        SET reason='RESERVATION',reservation_id=${input.reservationId},hold_id=NULL,updated_at=now()
        WHERE tenant_id=${ctx.tenantId} AND id=${allocations[0].id}`);
    } else {
      const newlyAssigned = resultRows<{ id: string }>(
        await tx.execute(sql`INSERT INTO inventory_allocations
          (tenant_id,unit_id,checkin,checkout,reason,reservation_id)
          VALUES (${ctx.tenantId},${reservation.unit_id},${reservation.checkin}::date,
            ${reservation.checkout}::date,'RESERVATION',${input.reservationId})
          ON CONFLICT DO NOTHING RETURNING id`),
      );
      if (!newlyAssigned[0]) {
        await tx.execute(sql`INSERT INTO outbox_jobs(tenant_id,kind,entity_id,due_at)
          VALUES(${ctx.tenantId},'PAYMENT_AVAILABILITY_CONFLICT',${input.reservationId},now())`);
        return { paymentId: saved.id, confirmation: 'CONFLICT' };
      }
    }

    if (hold) {
      await tx.execute(sql`UPDATE reservation_holds SET status='CONVERTED'
        WHERE tenant_id=${ctx.tenantId} AND id=${hold.id}`);
    }
    await tx.execute(sql`UPDATE reservations SET status='CONFIRMED',updated_at=now()
      WHERE tenant_id=${ctx.tenantId} AND id=${input.reservationId}`);
    await appendAuditEvent(tx, {
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorType: ctx.actorType,
      entity: 'reservation',
      entityId: input.reservationId,
      action: 'CONFIRMED_AFTER_MANUAL_PAYMENT',
      correlationId: input.idempotencyKey,
    });
    await tx.execute(sql`INSERT INTO outbox_jobs(tenant_id,kind,entity_id,due_at)
      VALUES (${ctx.tenantId},'RESERVATION_CONFIRMED',${input.reservationId},now())`);
    return { paymentId: saved.id, confirmation: 'CONFIRMED' };
  });
}
