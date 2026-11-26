import { sql } from 'drizzle-orm';

import { runTenantTx, type TenantContext } from '@/infrastructure/db/tenant-transaction';
import { type ActorRole, requirePermission } from '@/modules/identity-access/domain/permissions';
import { RefundError } from '@/modules/payments/domain/refund';
import {
  createMercadoPagoGateway,
  MercadoPagoApiError,
  type RefundGateway,
} from '@/modules/payments/integrations/mercadopago';

import { reconcileRefundEvidence } from './refund-reconciliation';
import {
  assertRefundable,
  lockRefund,
  readRefund,
  refundAudit,
  refundBudget,
  refundResult,
} from './refund-store';

function providerFailure(error: unknown) {
  if (error instanceof MercadoPagoApiError) {
    const messages: Record<string, string> = {
      insufficient_money_for_refund:
        'Mercado Pago no tiene saldo disponible suficiente para esta devolución.',
      refund_amount_exceeds:
        'Mercado Pago informa que el importe supera el saldo disponible para devolver.',
      refund_period_exceeded: 'El pago superó el plazo de devolución admitido por Mercado Pago.',
      transaction_not_found: 'Mercado Pago no encuentra la transacción original.',
      invalid_credentials: 'Revisá la configuración de Mercado Pago antes de volver a operar.',
      forbidden: 'La cuenta de Mercado Pago no tiene permiso para realizar esta devolución.',
      payment_not_refundable: 'Mercado Pago informa que este pago no admite una devolución.',
      amount_not_refundable: 'Mercado Pago no permite devolver este importe.',
    };
    const definitive =
      [401, 403, 404].includes(error.status) || Object.hasOwn(messages, error.code);
    return {
      definitive,
      message:
        messages[error.code] ??
        'El resultado de Mercado Pago necesita verificación. Consultá el estado antes de volver a operar.',
    };
  }
  return {
    definitive: false,
    message:
      'No pudimos verificar el resultado de Mercado Pago. Consultá el estado; el importe sigue protegido.',
  };
}
export async function executeRefund(
  ctx: TenantContext,
  role: ActorRole,
  id: string,
  gateway?: RefundGateway,
) {
  requirePermission(role, 'refunds:approve');
  const initial = await runTenantTx(ctx, async (tx) => {
    const context = await lockRefund(tx, ctx, id);
    if (context.refund.status !== 'APPROVED') {
      if (
        ['PROCESSING', 'UNCERTAIN', 'EXECUTED', 'FAILED', 'REJECTED'].includes(
          context.refund.status,
        )
      )
        return { ready: false as const, refund: context.refund };
      throw new RefundError('CONFLICT', 'La solicitud debe estar aprobada antes de enviar dinero.');
    }
    assertRefundable(context.payment, context.reservation.status);
    if (context.payment.provider_order_id !== context.refund.provider_order_id)
      throw new RefundError('CONFLICT', 'La referencia de Mercado Pago necesita revisión.');
    return { ready: true as const, ...context };
  });
  if (!initial.ready) return refundResult(initial.refund);
  if (!gateway && !process.env.MERCADO_PAGO_ACCESS_TOKEN)
    throw new RefundError(
      'UNAVAILABLE',
      'Configurá Mercado Pago para enviar devoluciones desde este entorno.',
    );
  const provider = gateway ?? createMercadoPagoGateway();
  let order: Awaited<ReturnType<RefundGateway['getRefundOrder']>>;
  try {
    order = await provider.getRefundOrder(initial.refund.provider_order_id!);
    if (order.id !== initial.refund.provider_order_id) throw new Error('Order inconsistente');
    await reconcileRefundEvidence(ctx, order.id, order.refunds);
  } catch {
    throw new RefundError(
      'UNAVAILABLE',
      'No pudimos verificar el pago en Mercado Pago. No se envió una nueva devolución; intentá consultar nuevamente.',
    );
  }
  const claim = await runTenantTx(ctx, async (tx) => {
    const { payment, reservation, refund } = await lockRefund(tx, ctx, id);
    if (refund.status !== 'APPROVED') return { send: false as const, refund };
    assertRefundable(payment, reservation.status);
    const remotePayment = order.payments.find((p) => p.id === payment.external_id);
    const budget = await refundBudget(tx, ctx, payment, id);
    const amount = BigInt(refund.amount_cents);
    const remoteUsed = order.refunds
      .filter((r) => r.transactionId === payment.external_id && r.status !== 'FAILED')
      .reduce((sum, r) => sum + r.amountCents, 0n);
    let problem = '';
    if (
      order.currency !== 'ARS' ||
      !remotePayment ||
      remotePayment.amountCents !== BigInt(payment.amount_cents) ||
      !['processed', 'approved', 'refunded'].includes(remotePayment.status)
    ) {
      problem =
        'No pudimos verificar la transacción original de Mercado Pago. Revisá el pago antes de devolver.';
    } else if (
      order.status !== 'processed' ||
      budget.legacy ||
      amount > budget.available ||
      amount > BigInt(payment.amount_cents) - remoteUsed
    ) {
      problem =
        'El pago ya no tiene ese importe disponible para devolver. Consultá los reintegros registrados.';
    }
    if (problem) {
      await tx.execute(sql`UPDATE refund_requests SET status='FAILED',last_error=${problem},updated_at=now()
        WHERE tenant_id=${ctx.tenantId} AND id=${id}`);
      await refundAudit(tx, ctx, id, 'REFUND_NOT_SENT', problem);
      return { send: false as const, refund: { ...refund, status: 'FAILED' as const } };
    }
    const snapshot = JSON.stringify(order.refunds.map((r) => r.id));
    await tx.execute(sql`UPDATE refund_requests SET status='PROCESSING',provider_refunds_before=${snapshot}::jsonb,
      submitted_at=now(),updated_at=now(),last_error=NULL WHERE tenant_id=${ctx.tenantId} AND id=${id}`);
    await tx.execute(sql`INSERT INTO outbox_jobs(tenant_id,kind,entity_id,due_at)
      VALUES(${ctx.tenantId},'MERCADO_PAGO_REFUND_SYNC',${id},now()+interval '1 minute')`);
    await refundAudit(tx, ctx, id, 'REFUND_SUBMITTED');
    return {
      send: true as const,
      amount,
      transactionId: payment.external_id!,
      orderId: refund.provider_order_id!,
      full:
        order.payments.length === 1 && remoteUsed === 0n && amount === BigInt(payment.amount_cents),
    };
  });
  if (!claim.send) return refundResult(claim.refund);
  try {
    const result = await provider.refundOrder({
      orderId: claim.orderId,
      transactionId: claim.transactionId,
      amountCents: claim.amount,
      idempotencyKey: id,
      full: claim.full,
    });
    await reconcileRefundEvidence(ctx, result.id, result.refunds);
    return runTenantTx(ctx, async (tx) => {
      const current = await readRefund(tx, ctx, id, true);
      if (current.status === 'PROCESSING' && !current.provider_refund_id) {
        await tx.execute(sql`UPDATE refund_requests SET status='UNCERTAIN',last_error='Mercado Pago recibió la solicitud, pero falta verificar su resultado.',updated_at=now()
          WHERE tenant_id=${ctx.tenantId} AND id=${id}`);
        current.status = 'UNCERTAIN';
      }
      return refundResult(current);
    });
  } catch (error) {
    const failure = providerFailure(error);
    return runTenantTx(ctx, async (tx) => {
      const current = await readRefund(tx, ctx, id, true);
      if (['EXECUTED', 'FAILED'].includes(current.status)) return refundResult(current);
      const status = failure.definitive ? ('FAILED' as const) : ('UNCERTAIN' as const);
      await tx.execute(sql`UPDATE refund_requests SET status=${status},last_error=${failure.message},updated_at=now()
        WHERE tenant_id=${ctx.tenantId} AND id=${id}`);
      await refundAudit(tx, ctx, id, 'REFUND_' + status, failure.message);
      return { id, status };
    });
  }
}
