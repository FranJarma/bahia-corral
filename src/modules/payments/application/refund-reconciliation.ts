import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';

import {
  resultRows,
  runTenantTx,
  type TenantContext,
  type TenantTx,
} from '@/infrastructure/db/tenant-transaction';
import { RefundError } from '@/modules/payments/domain/refund';
import {
  createMercadoPagoGateway,
  type RefundGateway,
  type VerifiedRefund,
} from '@/modules/payments/integrations/mercadopago';

import {
  lockRefundPayment,
  readRefund,
  refundAudit,
  type RefundPayment,
  type RefundRecord,
  refundResult,
} from './refund-store';

async function applyPaymentRefunds(
  tx: TenantTx,
  ctx: TenantContext,
  payment: RefundPayment,
  evidence: VerifiedRefund[],
) {
  const observed = evidence.filter((r) => r.transactionId === payment.external_id);
  if (
    new Set(observed.map((r) => r.id)).size !== observed.length ||
    observed.filter((r) => r.status !== 'FAILED').reduce((sum, r) => sum + r.amountCents, 0n) >
      BigInt(payment.amount_cents)
  ) {
    throw new RefundError(
      'CONFLICT',
      'La evidencia de Mercado Pago necesita revisión antes de actualizar los importes.',
    );
  }
  const rows = resultRows<RefundRecord>(
    await tx.execute(sql`SELECT id,reservation_id,payment_id,amount_cents::text,reason,status,
    provider_order_id,provider_refund_id,source,provider_refunds_before,last_error,idempotency_key
    FROM refund_requests WHERE tenant_id=${ctx.tenantId} AND payment_id=${payment.id} FOR UPDATE`),
  );
  const linked = new Set(rows.flatMap((r) => (r.provider_refund_id ? [r.provider_refund_id] : [])));
  for (const refund of rows.filter(
    (r) =>
      r.source === 'ADMIN' &&
      !r.provider_refund_id &&
      ['PROCESSING', 'UNCERTAIN'].includes(r.status) &&
      r.provider_refunds_before !== null,
  )) {
    const matches = observed.filter(
      (r) =>
        !linked.has(r.id) &&
        !refund.provider_refunds_before!.includes(r.id) &&
        r.amountCents === BigInt(refund.amount_cents),
    );
    if (matches.length === 1) {
      refund.provider_refund_id = matches[0].id;
      linked.add(matches[0].id);
    }
  }
  const providerCtx = { ...ctx, actorId: 'mercadopago', actorType: 'PROVIDER' as const };
  for (const item of observed) {
    const row = rows.find((r) => r.provider_refund_id === item.id);
    if (!row) {
      const [known] = resultRows<{ payment_id: string }>(
        await tx.execute(sql`SELECT payment_id FROM refund_requests
        WHERE tenant_id=${ctx.tenantId} AND provider_refund_id=${item.id}`),
      );
      if (known && known.payment_id !== payment.id)
        throw new RefundError(
          'CONFLICT',
          'La devolución del proveedor no coincide con el pago original.',
        );
      const id = randomUUID();
      await tx.execute(sql`INSERT INTO refund_requests(id,tenant_id,reservation_id,payment_id,provider,provider_order_id,provider_refund_id,amount_cents,reason,source,status,requested_by,executed_by,executed_at,checked_at)
        VALUES(${id},${ctx.tenantId},${payment.reservation_id},${payment.id},'MERCADO_PAGO',${payment.provider_order_id},${item.id},
          ${item.amountCents.toString()},'Devolución registrada directamente en Mercado Pago','PROVIDER',${item.status},'mercadopago',
          ${item.status === 'EXECUTED' ? 'mercadopago' : null},${item.status === 'EXECUTED' ? sql`now()` : sql`NULL`},now())`);
      await refundAudit(
        tx,
        providerCtx,
        id,
        'REFUND_OBSERVED',
        'Evidencia consultada en Mercado Pago.',
      );
      if (item.status === 'EXECUTED') await refundAudit(tx, providerCtx, id, 'REFUND_EXECUTED');
      continue;
    }
    if (BigInt(row.amount_cents) !== item.amountCents)
      throw new RefundError(
        'CONFLICT',
        'El importe devuelto por Mercado Pago no coincide con la solicitud.',
      );
    if (row.status === 'EXECUTED') continue;
    await tx.execute(sql`UPDATE refund_requests SET provider_refund_id=${item.id},status=${item.status},checked_at=now(),updated_at=now(),
      executed_at=CASE WHEN ${item.status}='EXECUTED' THEN COALESCE(executed_at,now()) ELSE executed_at END,
      executed_by=CASE WHEN ${item.status}='EXECUTED' THEN 'mercadopago' ELSE executed_by END,
      last_error=${item.status === 'FAILED' ? 'Mercado Pago rechazó la devolución.' : null}
      WHERE tenant_id=${ctx.tenantId} AND id=${row.id}`);
    if (item.status !== row.status)
      await refundAudit(
        tx,
        providerCtx,
        row.id,
        item.status === 'EXECUTED' ? 'REFUND_EXECUTED' : 'REFUND_' + item.status,
      );
  }
}

export async function reconcileRefundEvidence(
  ctx: TenantContext,
  orderId: string,
  evidence: VerifiedRefund[],
) {
  if (!evidence.length) return;
  await runTenantTx(ctx, async (tx) => {
    const payments = resultRows<{ id: string; reservation_id: string }>(
      await tx.execute(sql`SELECT p.id,p.reservation_id FROM payments p
      JOIN payment_requests pr ON pr.tenant_id=p.tenant_id AND pr.id=p.request_id
      WHERE p.tenant_id=${ctx.tenantId} AND p.provider='MERCADO_PAGO' AND pr.provider_order_id=${orderId} ORDER BY p.id`),
    );
    for (const row of payments) {
      const { payment } = await lockRefundPayment(tx, ctx, row.reservation_id, row.id);
      await applyPaymentRefunds(tx, ctx, payment, evidence);
    }
  });
}
export async function reconcileRefund(ctx: TenantContext, id: string, gateway?: RefundGateway) {
  const refund = await runTenantTx(ctx, (tx) => readRefund(tx, ctx, id));
  if (!refund.provider_order_id || !refund.payment_id)
    throw new RefundError('CONFLICT', 'Esta devolución necesita revisar su pago original.');
  if (['EXECUTED', 'FAILED', 'REJECTED'].includes(refund.status)) return refundResult(refund);
  const provider = gateway ?? createMercadoPagoGateway();
  const order = await provider.getRefundOrder(refund.provider_order_id);
  if (order.id !== refund.provider_order_id)
    throw new RefundError('CONFLICT', 'La order de Mercado Pago no coincide con la devolución.');
  await reconcileRefundEvidence(ctx, order.id, order.refunds);
  return runTenantTx(ctx, async (tx) => {
    const current = await readRefund(tx, ctx, id, true);
    // Un resultado sin evidencia sigue protegido. Consultar estado nunca reenvía dinero.
    if (current.status === 'PROCESSING' && !current.provider_refund_id) {
      await tx.execute(sql`UPDATE refund_requests SET status='UNCERTAIN',checked_at=now(),updated_at=now(),
        last_error='El resultado necesita verificación. No vuelvas a enviar el reintegro.'
        WHERE tenant_id=${ctx.tenantId} AND id=${id}`);
      current.status = 'UNCERTAIN';
    }
    return refundResult(current);
  });
}
