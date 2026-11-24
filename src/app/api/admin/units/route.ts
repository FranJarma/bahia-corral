import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export async function PATCH(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'accommodations:write');
    const data = await jsonInput(
      request,
      z.object({
        id: z.string().uuid(),
        name: z.string().min(3),
        description: z.string().max(3000),
        published: z.boolean(),
      }),
    );
    const row = await runTenantTx(
      { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
      async (tx) =>
        resultRows<{ id: string }>(
          await tx.execute(sql`
    UPDATE accommodation_units SET name=${data.name},description=${data.description},published=${data.published},updated_at=now()
    WHERE tenant_id=${actor.tenantId} AND id=${data.id} RETURNING id`),
        ),
    );
    if (!row[0]) return NextResponse.json({ error: 'Alojamiento inexistente' }, { status: 404 });
    return successJson({ updated: true });
  } catch (error) {
    return failResponse(error);
  }
}

export async function GET() {
  try {
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'reservations:read');
    const units = await runTenantTx(
      { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
      async (tx) =>
        resultRows<{
          id: string;
          name: string;
          capacity_total: number;
          type: string;
          published: boolean;
        }>(
          await tx.execute(sql`
    SELECT id,name,capacity_total,type,published FROM accommodation_units WHERE tenant_id=${actor.tenantId} ORDER BY code`),
        ),
    );
    return successJson({ units });
  } catch (error) {
    return failResponse(error);
  }
}
