import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';

import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import { type ActorRole, requirePermission } from '@/modules/identity-access/domain/permissions';
import { RefundError } from '@/modules/payments/domain/refund';

import {
  assertRefundable,
  lockRefund,
  lockRefundPayment,
  refundAudit,
  refundBudget,
  type RefundRecord,
  refundResult,
} from './refund-store';

export async function requestRefund(
  ctx: TenantContext,
  role: ActorRole,
  input: {
    reservationId: string;
    paymentId: string;
    amountCents: bigint;
    reason: string;
    idempotencyKey: string;
  },
) {
  requirePermission(role, 'refunds:request');
  const reason = input.reason.trim();
  if (
    input.amountCents <= 0n ||
    input.amountCents > 999999999999999999n ||
    reason.length < 3 ||
    reason.length > 1000
  ) {
    throw new RefundError(
      'INVALID_INPUT',
      'Ingresá un importe positivo y un motivo de al menos 3 caracteres.',
    );
  }
  return runTenantTx(ctx, async (tx) => {
    const { payment, reservation } = await lockRefundPayment(
      tx,
      ctx,
      input.reservationId,
      input.paymentId,
    );
    const [existing] = resultRows<RefundRecord>(
      await tx.execute(sql`SELECT id,status,payment_id,reservation_id,amount_cents::text,reason
      FROM refund_requests WHERE tenant_id=${ctx.tenantId} AND idempotency_key=${input.idempotencyKey}`),
    );
    if (existing) {
      if (
        existing.payment_id !== input.paymentId ||
        existing.reservation_id !== input.reservationId ||
        BigInt(existing.amount_cents) !== input.amountCents ||
        existing.reason !== reason
      ) {
        throw new RefundError(
          'CONFLICT',
          'El reintento tiene datos diferentes a la solicitud original.',
        );
      }
      return refundResult(existing);
    }
    assertRefundable(payment, reservation.status);
    const budget = await refundBudget(tx, ctx, payment);
    if (budget.legacy)
      throw new RefundError(
        'CONFLICT',
        'Hay una devolución histórica sin pago asociado. Revisala antes de tramitar otra.',
      );
    if (budget.active)
      throw new RefundError(
        'CONFLICT',
        'Ya hay una devolución pendiente para este pago. Consultá su estado.',
      );
    if (input.amountCents > budget.available)
      throw new RefundError('CONFLICT', 'El importe supera el saldo disponible para devolver.');
    const id = randomUUID();
    await tx.execute(sql`INSERT INTO refund_requests(id,tenant_id,reservation_id,payment_id,provider,provider_order_id,amount_cents,reason,idempotency_key,requested_by)
      VALUES(${id},${ctx.tenantId},${input.reservationId},${input.paymentId},'MERCADO_PAGO',${payment.provider_order_id},
        ${input.amountCents.toString()},${reason},${input.idempotencyKey},${ctx.actorId})`);
    await refundAudit(tx, ctx, id, 'REQUESTED', reason);
    return { id, status: 'REQUESTED' as const };
  });
}
export async function decideRefund(
  ctx: TenantContext,
  role: ActorRole,
  id: string,
  decision: 'approve' | 'reject',
  reason?: string,
) {
  requirePermission(role, 'refunds:approve');
  if (decision === 'reject' && (!reason || reason.trim().length < 3))
    throw new RefundError('INVALID_INPUT', 'Ingresá el motivo del rechazo.');
  return runTenantTx(ctx, async (tx) => {
    const { payment, reservation, refund } = await lockRefund(tx, ctx, id);
    if (decision === 'approve' && refund.status === 'APPROVED') return refundResult(refund);
    if (decision === 'reject' && refund.status === 'REJECTED') return refundResult(refund);
    if (decision === 'approve') {
      if (refund.status !== 'REQUESTED')
        throw new RefundError('CONFLICT', 'La solicitud ya no está disponible para aprobar.');
      assertRefundable(payment, reservation.status);
      const budget = await refundBudget(tx, ctx, payment, id);
      if (budget.legacy || BigInt(refund.amount_cents) > budget.available)
        throw new RefundError(
          'CONFLICT',
          'El pago ya no tiene ese importe disponible para devolver.',
        );
      await tx.execute(sql`UPDATE refund_requests SET status='APPROVED',approved_by=${ctx.actorId},updated_at=now()
        WHERE tenant_id=${ctx.tenantId} AND id=${id}`);
      await refundAudit(tx, ctx, id, 'APPROVED');
      return { id, status: 'APPROVED' as const };
    }
    if (!['REQUESTED', 'APPROVED'].includes(refund.status))
      throw new RefundError(
        'CONFLICT',
        'Una devolución enviada a Mercado Pago debe conciliarse antes de cualquier cambio.',
      );
    await tx.execute(sql`UPDATE refund_requests SET status='REJECTED',decision_reason=${reason!.trim()},updated_at=now()
      WHERE tenant_id=${ctx.tenantId} AND id=${id}`);
    await refundAudit(tx, ctx, id, 'REJECTED', reason!.trim());
    return { id, status: 'REJECTED' as const };
  });
}
