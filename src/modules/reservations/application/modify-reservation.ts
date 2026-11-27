import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import { getQuoteInput } from '@/modules/pricing/application/get-quote';
import { quoteStay, quoteToRecord } from '@/modules/pricing/domain/pricing-engine';

export type ReservationChange = {
  reservationId: string;
  unitId: string;
  checkin: string;
  checkout: string;
  adults: number;
  childAges: number[];
  reason: string;
};
export async function modifyReservation(ctx: TenantContext, input: ReservationChange) {
  if (!input.reason.trim()) throw new Error('Es obligatorio indicar un motivo de modificación');
  const nextQuote = quoteToRecord(
    quoteStay(
      await getQuoteInput(
        input.unitId,
        input.checkin,
        input.checkout,
        input.adults,
        input.childAges,
      ),
    ),
  );
  await runTenantTx(ctx, async (tx) => {
    const [current] = resultRows<{ quote_id: string; status: string }>(
      await tx.execute(
        sql`SELECT quote_id,status FROM reservations WHERE tenant_id=${ctx.tenantId} AND id=${input.reservationId} FOR UPDATE`,
      ),
    );
    if (!current || !['CONFIRMED', 'IN_STAY'].includes(current.status))
      throw new Error('Solo se modifican reservas confirmadas o en estadía');
    const newQuoteId = randomUUID();
    await tx.execute(sql`INSERT INTO stay_quotes(id,tenant_id,unit_id,checkin,checkout,adults,child_ages,nights,amount_cents,deposit_cents,currency,terms_version)
      VALUES (${newQuoteId},${ctx.tenantId},${input.unitId},${input.checkin}::date,${input.checkout}::date,${input.adults},${sql.param(input.childAges)}::integer[],${JSON.stringify(nextQuote.nights)}::jsonb,${nextQuote.totalCents},${nextQuote.depositCents},'ARS','v1')`);
    // El UPDATE de la allocation bajo restricción GiST puede fallar y revertir TODO el cambio.
    const changed = resultRows<{ id: string }>(
      await tx.execute(sql`UPDATE inventory_allocations SET unit_id=${input.unitId},checkin=${input.checkin}::date,checkout=${input.checkout}::date,updated_at=now()
      WHERE tenant_id=${ctx.tenantId} AND reservation_id=${input.reservationId} AND active=true RETURNING id`),
    );
    if (!changed[0]) throw new Error('No se encontró la asignación original');
    await tx.execute(sql`UPDATE reservations SET unit_id=${input.unitId},checkin=${input.checkin}::date,checkout=${input.checkout}::date,adults=${input.adults},child_ages=${sql.param(input.childAges)}::integer[],quote_id=${newQuoteId},updated_at=now()
      WHERE tenant_id=${ctx.tenantId} AND id=${input.reservationId}`);
    await tx.execute(sql`INSERT INTO reservation_revisions(tenant_id,reservation_id,previous_quote_id,new_quote_id,reason,changed_by)
      VALUES(${ctx.tenantId},${input.reservationId},${current.quote_id},${newQuoteId},${input.reason},${ctx.actorId})`);
    await appendAuditEvent(tx, {
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorType: ctx.actorType,
      entity: 'reservation',
      entityId: input.reservationId,
      action: 'REBOOKED',
      reason: input.reason,
      correlationId: newQuoteId,
    });
  });
  return { amountCents: nextQuote.totalCents };
}
