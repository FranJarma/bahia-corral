import { createHash, randomBytes } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import { holdExpiresAt } from '@/modules/availability/domain/holds';
import { getQuoteInput } from '@/modules/pricing/application/get-quote';
import { quoteStay, quoteToRecord } from '@/modules/pricing/domain/pricing-engine';

export type StartCheckoutInput = {
  unitId: string;
  checkin: string;
  checkout: string;
  adults: number;
  childAges: number[];
};
export type CheckoutHold = {
  holdId: string;
  quoteId: string;
  expiresAt: string;
  totalCents: string;
  depositCents: string;
  checkoutToken: string;
};

/** Libera únicamente holds sin pago iniciado. Nunca toca VERIFYING ni UNCERTAIN. */
export async function releaseExpiredHolds(ctx: TenantContext, unitId?: string): Promise<number> {
  return runTenantTx(ctx, async (tx) => {
    const candidates = resultRows<{ id: string; reservation_id: string | null }>(
      await tx.execute(sql`SELECT id,reservation_id FROM reservation_holds
        WHERE tenant_id=${ctx.tenantId} AND status='ACTIVE' AND payment_started_at IS NULL
          AND expires_at<=now() ${unitId ? sql`AND unit_id=${unitId}` : sql``}`),
    );
    let released = 0;
    for (const candidate of candidates) {
      if (candidate.reservation_id) {
        // Mismo orden de bloqueo que las operaciones de pago y confirmación.
        const [reservation] = resultRows<{ id: string }>(
          await tx.execute(sql`
          SELECT id FROM reservations WHERE tenant_id=${ctx.tenantId}
            AND id=${candidate.reservation_id} AND status='PENDING_CONFIRMATION'
          FOR UPDATE SKIP LOCKED`),
        );
        if (!reservation) continue;
      }
      const [hold] = resultRows<{ id: string }>(
        await tx.execute(sql`
        SELECT id FROM reservation_holds WHERE tenant_id=${ctx.tenantId} AND id=${candidate.id}
          AND reservation_id IS NOT DISTINCT FROM ${candidate.reservation_id}::uuid
          AND status='ACTIVE' AND payment_started_at IS NULL AND expires_at<=now()
          AND NOT EXISTS(SELECT 1 FROM payments p WHERE p.tenant_id=${ctx.tenantId}
            AND p.reservation_id=${candidate.reservation_id})
        FOR UPDATE SKIP LOCKED`),
      );
      if (!hold) continue;
      await tx.execute(
        sql`UPDATE reservation_holds SET status='EXPIRED' WHERE tenant_id=${ctx.tenantId} AND id=${hold.id}`,
      );
      await tx.execute(sql`UPDATE inventory_allocations SET active=false,updated_at=now()
        WHERE tenant_id=${ctx.tenantId} AND hold_id=${hold.id} AND reason='HOLD'`);
      if (candidate.reservation_id)
        await tx.execute(sql`UPDATE reservations SET status='NOT_COMPLETED',updated_at=now()
          WHERE tenant_id=${ctx.tenantId} AND id=${candidate.reservation_id} AND status='PENDING_CONFIRMATION'`);
      await appendAuditEvent(tx, {
        ...ctx,
        entity: candidate.reservation_id ? 'reservation' : 'reservation_hold',
        entityId: candidate.reservation_id ?? hold.id,
        action: 'CHECKOUT_EXPIRED',
        reason: 'Venció el plazo para completar la reserva sin iniciar un pago.',
        correlationId: hold.id,
      });
      released++;
    }
    return released;
  });
}

export async function startCheckout(
  ctx: TenantContext,
  input: StartCheckoutInput,
): Promise<CheckoutHold> {
  // La tarifa se obtiene del servidor, nunca del cliente. Un cambio simultáneo de tarifa
  // entre esta lectura y la asignación se mantiene como cotización protegida al adquirir hold.
  const quote = quoteStay(
    await getQuoteInput(input.unitId, input.checkin, input.checkout, input.adults, input.childAges),
  );
  const serialized = quoteToRecord(quote);
  await releaseExpiredHolds(ctx, input.unitId);
  return runTenantTx(ctx, async (tx) => {
    const quoteId = crypto.randomUUID();
    const holdId = crypto.randomUUID();
    const checkoutToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(checkoutToken).digest('hex');
    const expiresAt = holdExpiresAt(new Date());
    await tx.execute(sql`INSERT INTO stay_quotes(id,tenant_id,unit_id,checkin,checkout,adults,child_ages,nights,amount_cents,deposit_cents,currency,terms_version)
      VALUES(${quoteId},${ctx.tenantId},${quote.unitId},${quote.checkin}::date,${quote.checkout}::date,${quote.adults},
        ${sql.param(quote.childAges)}::integer[],${JSON.stringify(serialized.nights)}::jsonb,${serialized.totalCents},${serialized.depositCents},'ARS','v1')`);
    await tx.execute(sql`INSERT INTO reservation_holds(id,tenant_id,unit_id,quote_id,expires_at,checkout_token_hash,status)
      VALUES(${holdId},${ctx.tenantId},${quote.unitId},${quoteId},${expiresAt.toISOString()}::timestamptz,${tokenHash},'ACTIVE')`);
    await tx.execute(sql`INSERT INTO outbox_jobs(tenant_id,kind,entity_id,due_at)
      VALUES(${ctx.tenantId},'CHECKOUT_EXPIRED',${holdId},${expiresAt.toISOString()}::timestamptz)`);
    // Exclusión GiST en PostgreSQL decide quién gana si llegan dos peticiones simultáneas.
    await tx.execute(sql`INSERT INTO inventory_allocations(tenant_id,unit_id,checkin,checkout,reason,hold_id,active)
      VALUES(${ctx.tenantId},${quote.unitId},${quote.checkin}::date,${quote.checkout}::date,'HOLD',${holdId},true)`);
    return {
      holdId,
      quoteId,
      expiresAt: expiresAt.toISOString(),
      totalCents: serialized.totalCents,
      depositCents: serialized.depositCents,
      checkoutToken,
    };
  });
}

export async function createAdministrativeBlock(
  ctx: TenantContext,
  input: { unitId: string; checkin: string; checkout: string; reason: string },
) {
  return runTenantTx(ctx, async (tx) => {
    const id = crypto.randomUUID();
    await tx.execute(sql`INSERT INTO inventory_allocations(id,tenant_id,unit_id,checkin,checkout,reason,block_reason)
      VALUES(${id},${ctx.tenantId},${input.unitId},${input.checkin}::date,${input.checkout}::date,'ADMIN_BLOCK',${input.reason})`);
    await appendAuditEvent(tx, {
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorType: ctx.actorType,
      entity: 'inventory_allocation',
      entityId: id,
      action: 'BLOCK_CREATED',
      reason: input.reason,
      correlationId: id,
    });
    return { id };
  });
}
