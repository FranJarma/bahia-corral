import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
import { getRefundSummary } from '@/modules/payments/application/get-refunds';
import { executeRefund } from '@/modules/payments/application/refund-execution';
import { reconcileRefund } from '@/modules/payments/application/refund-reconciliation';
import { decideRefund, requestRefund } from '@/modules/payments/application/refund-requests';
import { RefundError } from '@/modules/payments/domain/refund';
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('request'),
    reservationId: z.uuid(),
    paymentId: z.uuid(),
    amountCents: z.string().regex(/^[1-9]\d{0,17}$/),
    reason: z.string().trim().min(3).max(1000),
    idempotencyKey: z.uuid(),
  }),
  z.object({ action: z.literal('approve'), refundId: z.uuid() }),
  z.object({
    action: z.literal('reject'),
    refundId: z.uuid(),
    reason: z.string().trim().min(3).max(1000),
  }),
  z.object({ action: z.literal('execute'), refundId: z.uuid() }),
  z.object({ action: z.literal('reconcile'), refundId: z.uuid() }),
]);
function failure(error: unknown) {
  if (error instanceof RefundError)
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID_INPUT' ? 400 : 409 },
    );
  return failResponse(error);
}
export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const id = z.uuid().parse(request.nextUrl.searchParams.get('reservationId'));
    const summary = await getRefundSummary(
      { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
      actor.role,
      id,
    );
    return successJson({ summary });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const data = await jsonInput(request, schema);
    const ctx = { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' as const };
    switch (data.action) {
      case 'request':
        return successJson(
          await requestRefund(ctx, actor.role, { ...data, amountCents: BigInt(data.amountCents) }),
          201,
        );
      case 'approve':
        return successJson(await decideRefund(ctx, actor.role, data.refundId, 'approve'));
      case 'reject':
        return successJson(
          await decideRefund(ctx, actor.role, data.refundId, 'reject', data.reason),
        );
      case 'execute': {
        const result = await executeRefund(ctx, actor.role, data.refundId);
        return successJson(result, ['PROCESSING', 'UNCERTAIN'].includes(result.status) ? 202 : 200);
      }
      case 'reconcile': {
        requirePermission(actor.role, 'payments:read');
        const result = await reconcileRefund(ctx, data.refundId);
        return successJson(result, ['PROCESSING', 'UNCERTAIN'].includes(result.status) ? 202 : 200);
      }
    }
  } catch (error) {
    return failure(error);
  }
}
