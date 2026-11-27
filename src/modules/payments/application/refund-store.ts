import { sql } from 'drizzle-orm';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import {
  resultRows,
  type TenantContext,
  type TenantTx,
} from '@/infrastructure/db/tenant-transaction';
import { RefundError, type RefundStatus } from '@/modules/payments/domain/refund';

export type RefundRecord = {
  id: string;
  reservation_id: string;
  payment_id: string | null;
  amount_cents: string;
  reason: string;
  status: RefundStatus;
  provider_order_id: string | null;
  provider_refund_id: string | null;
  source: 'ADMIN' | 'PROVIDER';
  provider_refunds_before: string[] | null;
  last_error: string | null;
  idempotency_key: string;
};
export type RefundPayment = {
  id: string;
  reservation_id: string;
  amount_cents: string;
  currency: string;
  provider: string;
  external_id: string | null;
  provider_order_id: string | null;
};
export async function readRefund(
  tx: TenantTx,
  ctx: TenantContext,
  id: string,
  lock = false,
): Promise<RefundRecord> {
  const [refund] = resultRows<RefundRecord>(
    await tx.execute(sql`SELECT id,reservation_id,payment_id,amount_cents::text,reason,status,
    provider_order_id,provider_refund_id,source,provider_refunds_before,last_error,idempotency_key
    FROM refund_requests WHERE tenant_id=${ctx.tenantId} AND id=${id} ${lock ? sql`FOR UPDATE` : sql``}`),
  );
  if (!refund) throw new RefundError('NOT_FOUND', 'La devolución no está disponible.');
  return refund;
}
export async function lockRefundPayment(
  tx: TenantTx,
  ctx: TenantContext,
  reservationId: string,
  paymentId: string,
) {
  const [reservation] = resultRows<{ status: string }>(
    await tx.execute(sql`SELECT status FROM reservations
    WHERE tenant_id=${ctx.tenantId} AND id=${reservationId} FOR UPDATE`),
  );
  if (!reservation) throw new RefundError('NOT_FOUND', 'La reserva no está disponible.');
  const [payment] = resultRows<RefundPayment>(
    await tx.execute(sql`SELECT p.id,p.reservation_id,p.amount_cents::text,p.currency,p.provider,p.external_id,pr.provider_order_id
    FROM payments p LEFT JOIN payment_requests pr ON pr.tenant_id=p.tenant_id AND pr.id=p.request_id
    WHERE p.tenant_id=${ctx.tenantId} AND p.id=${paymentId} AND p.reservation_id=${reservationId} FOR UPDATE OF p`),
  );
  if (!payment) throw new RefundError('NOT_FOUND', 'El pago no está disponible para esta reserva.');
  return { payment, reservation };
}
export async function lockRefund(tx: TenantTx, ctx: TenantContext, id: string) {
  const current = await readRefund(tx, ctx, id);
  if (!current.payment_id || !current.provider_order_id || current.source !== 'ADMIN') {
    throw new RefundError(
      'CONFLICT',
      'Esta devolución necesita revisar su pago original antes de operar.',
    );
  }
  const context = await lockRefundPayment(tx, ctx, current.reservation_id, current.payment_id);
  return { ...context, refund: await readRefund(tx, ctx, id, true) };
}
export function assertRefundable(payment: RefundPayment, status: string) {
  if (status !== 'CANCELLED')
    throw new RefundError('CONFLICT', 'Primero anulá la reserva para gestionar su devolución.');
  if (
    payment.provider !== 'MERCADO_PAGO' ||
    !payment.external_id ||
    !payment.provider_order_id ||
    payment.currency !== 'ARS'
  ) {
    throw new RefundError(
      'CONFLICT',
      'Este pago no puede devolverse desde Mercado Pago. Revisá el medio de cobro original.',
    );
  }
}
export async function refundBudget(
  tx: TenantTx,
  ctx: TenantContext,
  payment: RefundPayment,
  excludeId?: string,
) {
  const [totals] = resultRows<{ used: string; active: number; legacy: number }>(
    await tx.execute(sql`
    SELECT COALESCE(SUM(amount_cents) FILTER(WHERE status IN ('REQUESTED','APPROVED','PROCESSING','UNCERTAIN','EXECUTED')),0)::text AS used,
      COUNT(*) FILTER(WHERE status IN ('REQUESTED','APPROVED','PROCESSING','UNCERTAIN'))::int AS active,
      (SELECT COUNT(*)::int FROM refund_requests legacy WHERE legacy.tenant_id=${ctx.tenantId}
        AND legacy.reservation_id=${payment.reservation_id} AND legacy.payment_id IS NULL AND legacy.amount_cents>0
        AND legacy.status NOT IN ('REJECTED','FAILED')) AS legacy
    FROM refund_requests WHERE tenant_id=${ctx.tenantId} AND payment_id=${payment.id}
      ${excludeId ? sql`AND id<>${excludeId}` : sql``}`),
  );
  return {
    available: BigInt(payment.amount_cents) - BigInt(totals.used),
    active: totals.active,
    legacy: totals.legacy,
  };
}
export async function refundAudit(
  tx: TenantTx,
  ctx: TenantContext,
  refundId: string,
  action: string,
  reason?: string,
) {
  await appendAuditEvent(tx, {
    tenantId: ctx.tenantId,
    actorId: ctx.actorId,
    actorType: ctx.actorType,
    entity: 'refund',
    entityId: refundId,
    action,
    reason,
    correlationId: refundId,
  });
}
export const refundResult = (refund: Pick<RefundRecord, 'id' | 'status'>) => ({
  id: refund.id,
  status: refund.status,
});
