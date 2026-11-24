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
  return runTenantTx(ctx, async (tx) => {
    const [current] = resultRows<{ status: ReservationStatus; unit_id: string }>(
      await tx.execute(
        sql`SELECT status,unit_id FROM reservations WHERE tenant_id=${ctx.tenantId} AND id=${reservationId} FOR UPDATE`,
      ),
    );
    if (!current) throw new Error('Reserva inexistente');
    assertTransition(current.status, to);
    const checkin = to === 'IN_STAY' ? sql`,checkin_actual=now()` : sql``;
    const checkout = to === 'COMPLETED' ? sql`,checkout_actual=now()` : sql``;
    await tx.execute(
      sql`UPDATE reservations SET status=${to},updated_at=now() ${checkin} ${checkout} WHERE tenant_id=${ctx.tenantId} AND id=${reservationId}`,
    );
    if (['CANCELLED', 'NO_SHOW'].includes(to)) {
      await tx.execute(
        sql`UPDATE inventory_allocations SET active=false,updated_at=now() WHERE tenant_id=${ctx.tenantId} AND reservation_id=${reservationId}`,
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
      reason,
      correlationId: reservationId,
    });
  });
}
