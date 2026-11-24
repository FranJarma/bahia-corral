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
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'events:manage');
    const events = await runTenantTx(
      { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
      async (tx) =>
        resultRows<{
          id: string;
          contact_name: string;
          email: string;
          event_type: string;
          status: string;
        }>(
          await tx.execute(sql`
    SELECT id,contact_name,email,event_type,status FROM event_inquiries WHERE tenant_id=${actor.tenantId} ORDER BY created_at DESC LIMIT 100`),
        ),
    );
    return successJson({ events });
  } catch (error) {
    return failResponse(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'events:manage');
    const body = await jsonInput(
      request,
      z.object({ id: z.string().uuid(), status: z.enum(['NEW', 'CONTACTED', 'CLOSED']) }),
    );
    await runTenantTx(
      { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
      async (tx) => {
        await tx.execute(
          sql`UPDATE event_inquiries SET status=${body.status} WHERE tenant_id=${actor.tenantId} AND id=${body.id}`,
        );
      },
    );
    return successJson({ updated: true });
  } catch (error) {
    return failResponse(error);
  }
}
