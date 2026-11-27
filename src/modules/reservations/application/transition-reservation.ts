import { sql } from 'drizzle-orm';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import {
  assertTransition,
  type ReservationStatus,
} from '@/modules/reservations/domain/reservation-state';

export async function transitionReservation(
  ctx: TenantContext,
  reservationId: string,
  to: ReservationStatus,
  reason?: string,
) {
  const auditReason = reason?.trim();
  if (to === 'CANCELLED' && (!auditReason || auditReason.length < 3)) {
    throw new Error('Ingresá un motivo de al menos 3 caracteres para anular la reserva.');
  }
  return runTenantTx(ctx, async (tx) => {
    const [current] = resultRows<{ status: ReservationStatus; unit_id: string }>(
      await tx.execute(
        sql`SELECT status,unit_id FROM reservations WHERE tenant_id=${ctx.tenantId} AND id=${reservationId} FOR UPDATE`,
      ),
    );
    if (!current) throw new Error('Reserva inexistente');
    if (to === 'CANCELLED') {
      if (current.status === 'CANCELLED') return;
      if (!['PENDING_CONFIRMATION', 'CONFIRMED'].includes(current.status)) {
        throw new Error('La reserva ya no está disponible para anular.');
      }
    }
    assertTransition(current.status, to);
    const checkin = to === 'IN_STAY' ? sql`,checkin_actual=now()` : sql``;
    const checkout = to === 'COMPLETED' ? sql`,checkout_actual=now()` : sql``;
    await tx.execute(
      sql`UPDATE reservations SET status=${to},updated_at=now() ${checkin} ${checkout} WHERE tenant_id=${ctx.tenantId} AND id=${reservationId}`,
    );
    if (to === 'CANCELLED') {
      // La anulación explícita cierra el checkout; no altera la evidencia de cobros en curso.
      await tx.execute(sql`UPDATE reservation_holds
        SET status=CASE WHEN status IN ('ACTIVE','VERIFYING','UNCERTAIN') THEN 'REJECTED' ELSE status END,
          checkout_token_hash=NULL
        WHERE tenant_id=${ctx.tenantId} AND reservation_id=${reservationId}`);
      await tx.execute(sql`UPDATE outbox_jobs SET status='CANCELLED'
        WHERE tenant_id=${ctx.tenantId} AND status IN ('PENDING','DISPATCHED','FAILED')
          AND ((entity_id=${reservationId} AND kind IN ('RESERVATION_CONFIRMED','BALANCE_REMINDER_48H','BALANCE_REMINDER_12H'))
            OR (kind='CHECKOUT_EXPIRED' AND entity_id IN
              (SELECT id::text FROM reservation_holds WHERE tenant_id=${ctx.tenantId} AND reservation_id=${reservationId})))`);
    }
    if (['CANCELLED', 'NO_SHOW'].includes(to)) {
      await tx.execute(
        sql`UPDATE inventory_allocations SET active=false,updated_at=now() WHERE tenant_id=${ctx.tenantId} AND (reservation_id=${reservationId}
          OR hold_id IN (SELECT id FROM reservation_holds WHERE tenant_id=${ctx.tenantId} AND reservation_id=${reservationId}))`,
      );
    }
    // El check-out anticipado no vuelve a comercializar noches ya contratadas.
    if (to === 'COMPLETED')
      await tx.execute(
        sql`UPDATE housekeeping_status SET status='PENDING',updated_at=now(),updated_by=${ctx.actorId} WHERE tenant_id=${ctx.tenantId} AND unit_id=${current.unit_id}`,
      );
    await appendAuditEvent(tx, {
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorType: ctx.actorType,
      entity: 'reservation',
      entityId: reservationId,
      action: to,
      reason: auditReason,
      correlationId: reservationId,
    });
  });
}
