import { sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { failResponse, successJson } from '@/infrastructure/http/route';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'reservations:read');
    const q = z
      .object({ from: z.iso.date(), to: z.iso.date() })
      .parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await runTenantTx(
      { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
      async (tx) => {
        const units = resultRows<{ id: string; name: string }>(
          await tx.execute(
            sql`SELECT id,name FROM accommodation_units WHERE tenant_id=${actor.tenantId} ORDER BY code`,
          ),
        );
        const entries = resultRows<{
          id: string;
          unit_id: string;
          unit_name: string;
          checkin: string;
          checkout: string;
          reason: string;
          guest_name: string | null;
          status: string | null;
        }>(
          await tx.execute(sql`
        SELECT a.id,a.unit_id,u.name AS unit_name,a.checkin::text,a.checkout::text,a.reason,
        CASE WHEN a.reservation_id IS NOT NULL THEN g.first_name||' '||g.last_name ELSE NULL END AS guest_name,r.status
        FROM inventory_allocations a JOIN accommodation_units u ON u.tenant_id=a.tenant_id AND u.id=a.unit_id
        LEFT JOIN reservations r ON r.tenant_id=a.tenant_id AND r.id=a.reservation_id
        LEFT JOIN guests g ON g.tenant_id=r.tenant_id AND g.id=r.guest_id
        WHERE a.tenant_id=${actor.tenantId} AND a.active=true AND a.checkout > ${q.from}::date AND a.checkin < ${q.to}::date
        ORDER BY u.code,a.checkin`),
        );
        return { units, entries };
      },
    );
    return successJson(data);
  } catch (error) {
    return failResponse(error);
  }
}
