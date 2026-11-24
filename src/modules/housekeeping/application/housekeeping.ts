import { sql } from 'drizzle-orm';

import { appendAuditEvent } from '@/infrastructure/audit/append-audit-event';
import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import { type ActorRole, requirePermission } from '@/modules/identity-access/domain/permissions';

export type CleaningStatus = 'PENDING' | 'IN_PROGRESS' | 'READY';
export async function listCleaning(ctx: TenantContext) {
  return runTenantTx(ctx, async (tx) =>
    resultRows<{ unit_id: string; name: string; status: CleaningStatus; updated_at: Date }>(
      await tx.execute(sql`
    SELECT u.id AS unit_id,u.name,h.status,h.updated_at FROM accommodation_units u
    JOIN housekeeping_status h ON h.tenant_id=u.tenant_id AND h.unit_id=u.id
    WHERE u.tenant_id=${ctx.tenantId} ORDER BY u.code`),
    ),
  );
}
export async function updateCleaning(
  ctx: TenantContext,
  role: ActorRole,
  input: { unitId: string; status: CleaningStatus },
) {
  requirePermission(role, 'housekeeping:write');
  return runTenantTx(ctx, async (tx) => {
    const old = resultRows<{ status: CleaningStatus }>(
      await tx.execute(
        sql`SELECT status FROM housekeeping_status WHERE tenant_id=${ctx.tenantId} AND unit_id=${input.unitId} FOR UPDATE`,
      ),
    );
    if (!old[0]) throw new Error('Alojamiento inexistente');
    const permitted: Record<CleaningStatus, CleaningStatus[]> = {
      PENDING: ['IN_PROGRESS'],
      IN_PROGRESS: ['READY', 'PENDING'],
      READY: ['PENDING'],
    };
    if (!permitted[old[0].status].includes(input.status))
      throw new Error('Transición de limpieza inválida');
    await tx.execute(
      sql`UPDATE housekeeping_status SET status=${input.status},updated_by=${ctx.actorId},updated_at=now() WHERE tenant_id=${ctx.tenantId} AND unit_id=${input.unitId}`,
    );
    await appendAuditEvent(tx, {
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      actorType: ctx.actorType,
      entity: 'cleaning',
      entityId: input.unitId,
      action: `${old[0].status}_TO_${input.status}`,
      correlationId: crypto.randomUUID(),
    });
  });
}
