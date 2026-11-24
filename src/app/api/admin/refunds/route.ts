import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('request'),
    reservationId: z.string().uuid(),
    amountCents: z.string().regex(/^\d+$/),
    reason: z.string().min(3),
  }),
  z.object({ action: z.literal('approve'), refundId: z.string().uuid() }),
  z.object({ action: z.literal('execute'), refundId: z.string().uuid() }),
]);
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const data = await jsonInput(request, schema);
    requirePermission(
      actor.role,
      data.action === 'request' ? 'refunds:request' : 'refunds:approve',
    );
    const ctx = { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' as const };
    const result = await runTenantTx(ctx, async (tx) => {
      if (data.action === 'request') {
        const [row] = resultRows<{ id: string }>(
          await tx.execute(sql`INSERT INTO refund_requests(tenant_id,reservation_id,amount_cents,reason,requested_by)
        VALUES(${actor.tenantId},${data.reservationId},${data.amountCents},${data.reason},${actor.userId}) RETURNING id`),
        );
        await appendAuditEvent(tx, {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorType: 'USER',
          entity: 'refund',
          entityId: row.id,
          action: 'REQUESTED',
          reason: data.reason,
          correlationId: row.id,
        });
        return row;
      }
      const [row] = resultRows<{ status: string }>(
        await tx.execute(
          sql`SELECT status FROM refund_requests WHERE tenant_id=${actor.tenantId} AND id=${data.refundId} FOR UPDATE`,
        ),
      );
      if (!row) throw new Error('Devolución inexistente');
      if (data.action === 'approve' && row.status === 'REQUESTED') {
        await tx.execute(
          sql`UPDATE refund_requests SET status='APPROVED',approved_by=${actor.userId} WHERE tenant_id=${actor.tenantId} AND id=${data.refundId}`,
        );
      } else if (data.action === 'execute' && row.status === 'APPROVED') {
        await tx.execute(
          sql`UPDATE refund_requests SET status='EXECUTED',executed_by=${actor.userId},executed_at=now() WHERE tenant_id=${actor.tenantId} AND id=${data.refundId}`,
        );
      } else throw new Error('Transición de reintegro inválida');
      await appendAuditEvent(tx, {
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorType: 'USER',
        entity: 'refund',
        entityId: data.refundId,
        action: data.action.toUpperCase(),
        correlationId: data.refundId,
      });
      return { id: data.refundId };
    });
    return successJson(result);
  } catch (error) {
    return failResponse(error);
  }
}
