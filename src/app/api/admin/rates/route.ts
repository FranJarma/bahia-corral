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
import { validateRateBands } from '@/modules/pricing/domain/rate-bands';

const band = z.object({
  minGuests: z.number().int().min(1),
  maxGuests: z.number().int().min(1),
  amountCents: z.string().regex(/^\d+$/),
});
const schema = z.object({ unitId: z.string().uuid(), bands: z.array(band).min(1) });
export async function PUT(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'pricing:write');
    const data = await jsonInput(request, schema);
    await runTenantTx(
      { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
      async (tx) => {
        const [unit] = resultRows<{ capacity_total: number }>(
          await tx.execute(
            sql`SELECT capacity_total FROM accommodation_units WHERE tenant_id=${actor.tenantId} AND id=${data.unitId} FOR UPDATE`,
          ),
        );
        if (!unit) throw new Error('Alojamiento inexistente');
        const ordered = validateRateBands(unit.capacity_total, data.bands);
        await tx.execute(
          sql`DELETE FROM base_rates WHERE tenant_id=${actor.tenantId} AND unit_id=${data.unitId}`,
        );
        for (const b of ordered)
          await tx.execute(
            sql`INSERT INTO base_rates(tenant_id,unit_id,min_guests,max_guests,amount_cents) VALUES(${actor.tenantId},${data.unitId},${b.minGuests},${b.maxGuests},${b.amountCents})`,
          );
        await appendAuditEvent(tx, {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorType: 'USER',
          entity: 'base_rates',
          entityId: data.unitId,
          action: 'RATE_BANDS_CHANGED',
          correlationId: crypto.randomUUID(),
        });
      },
    );
    return successJson({ updated: true });
  } catch (error) {
    return failResponse(error);
  }
}
