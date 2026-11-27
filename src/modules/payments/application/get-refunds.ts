import { sql } from 'drizzle-orm';

import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import {
  type ActorRole,
  hasPermission,
  requirePermission,
} from '@/modules/identity-access/domain/permissions';
import { RefundError, type RefundStatus } from '@/modules/payments/domain/refund';

export type RefundSummary = {
  reservationId: string;
  reference: string;
  reservationStatus: string;
  providerConfigured: boolean;
  canApprove: boolean;
  paidCents: string;
  refundedCents: string;
  payments: {
    id: string;
    amountCents: string;
    refundedCents: string;
    availableCents: string;
    method: string;
    paidAt: string;
    blockedReason: string | null;
  }[];
  refunds: {
    id: string;
    paymentId: string | null;
    amountCents: string;
    reason: string;
    status: RefundStatus;
    providerRefundId: string | null;
    source: string;
    error: string | null;
    decisionReason: string | null;
    createdAt: string;
  }[];
};
export async function getRefundSummary(
  ctx: TenantContext,
  role: ActorRole,
  reservationId: string,
): Promise<RefundSummary> {
  requirePermission(role, 'payments:read');
  return runTenantTx(ctx, async (tx) => {
    const [reservation] = resultRows<{
      reference: string;
      status: string;
      paid: string;
      refunded: string;
      legacy: number;
    }>(
      await tx.execute(sql`SELECT r.reference,r.status,
      COALESCE((SELECT SUM(p.amount_cents) FROM payments p WHERE p.tenant_id=r.tenant_id AND p.reservation_id=r.id),0)::text AS paid,
      COALESCE((SELECT SUM(f.amount_cents) FROM refund_requests f WHERE f.tenant_id=r.tenant_id AND f.reservation_id=r.id AND f.status='EXECUTED'),0)::text AS refunded,
      (SELECT COUNT(*)::int FROM refund_requests f WHERE f.tenant_id=r.tenant_id AND f.reservation_id=r.id AND f.payment_id IS NULL AND f.amount_cents>0 AND f.status NOT IN ('REJECTED','FAILED')) AS legacy
      FROM reservations r WHERE r.tenant_id=${ctx.tenantId} AND r.id=${reservationId}`),
    );
    if (!reservation) throw new RefundError('NOT_FOUND', 'La reserva no está disponible.');
    const payments = resultRows<{
      id: string;
      amount: string;
      refunded: string;
      reserved: string;
      active: number;
      external_id: string | null;
      provider_order_id: string | null;
      method: string;
      paid_at: string;
    }>(
      await tx.execute(sql`SELECT p.id,p.amount_cents::text AS amount,p.external_id,pr.provider_order_id,p.method,p.verified_at::text AS paid_at,
      COALESCE((SELECT SUM(f.amount_cents) FROM refund_requests f WHERE f.tenant_id=p.tenant_id AND f.payment_id=p.id AND f.status='EXECUTED'),0)::text AS refunded,
      COALESCE((SELECT SUM(f.amount_cents) FROM refund_requests f WHERE f.tenant_id=p.tenant_id AND f.payment_id=p.id AND f.status IN ('REQUESTED','APPROVED','PROCESSING','UNCERTAIN','EXECUTED')),0)::text AS reserved,
      (SELECT COUNT(*)::int FROM refund_requests f WHERE f.tenant_id=p.tenant_id AND f.payment_id=p.id AND f.status IN ('REQUESTED','APPROVED','PROCESSING','UNCERTAIN')) AS active
      FROM payments p LEFT JOIN payment_requests pr ON pr.tenant_id=p.tenant_id AND pr.id=p.request_id
      WHERE p.tenant_id=${ctx.tenantId} AND p.reservation_id=${reservationId} AND p.provider='MERCADO_PAGO' AND p.currency='ARS' ORDER BY p.verified_at`),
    );
    const refunds = resultRows<{
      id: string;
      payment_id: string | null;
      amount_cents: string;
      reason: string;
      status: RefundStatus;
      provider_refund_id: string | null;
      source: string;
      last_error: string | null;
      decision_reason: string | null;
      created_at: string;
    }>(
      await tx.execute(sql`SELECT id,payment_id,amount_cents::text,reason,status,provider_refund_id,source,last_error,decision_reason,created_at::text
      FROM refund_requests WHERE tenant_id=${ctx.tenantId} AND reservation_id=${reservationId} ORDER BY created_at DESC LIMIT 100`),
    );
    return {
      reservationId,
      reference: reservation.reference,
      reservationStatus: reservation.status,
      providerConfigured: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
      canApprove: hasPermission(role, 'refunds:approve'),
      paidCents: reservation.paid,
      refundedCents: reservation.refunded,
      payments: payments.map((p) => {
        const remaining = BigInt(p.amount) - BigInt(p.reserved);
        return {
          id: p.id,
          amountCents: p.amount,
          refundedCents: p.refunded,
          availableCents: (remaining > 0n ? remaining : 0n).toString(),
          method: p.method,
          paidAt: p.paid_at,
          blockedReason:
            reservation.status !== 'CANCELLED'
              ? 'Primero anulá la reserva.'
              : reservation.legacy
                ? 'Hay devoluciones históricas que requieren revisión.'
                : !p.external_id || !p.provider_order_id
                  ? 'Falta identificar el pago original de Mercado Pago.'
                  : p.active
                    ? 'Hay una devolución pendiente para este pago.'
                    : null,
        };
      }),
      refunds: refunds.map((f) => ({
        id: f.id,
        paymentId: f.payment_id,
        amountCents: f.amount_cents,
        reason: f.reason,
        status: f.status,
        providerRefundId: f.provider_refund_id,
        source: f.source,
        error: f.last_error,
        decisionReason: f.decision_reason,
        createdAt: f.created_at,
      })),
    };
  });
}
