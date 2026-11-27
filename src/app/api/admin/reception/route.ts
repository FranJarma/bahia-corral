import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { failResponse, successJson } from '@/infrastructure/http/route';
import { getAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const actor = await getAdminActor();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    requirePermission(actor.role, 'reservations:read');
    const units = await runTenantTx(
      { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
      async (tx) =>
        resultRows<{
          unit_id: string;
          name: string;
          cleaning: string;
          guest_name: string | null;
          checkin: string | null;
          checkout: string | null;
          reservation_status: string | null;
        }>(
          await tx.execute(sql`
    SELECT u.id AS unit_id,u.name,h.status AS cleaning,
      g.first_name||' '||g.last_name AS guest_name,r.checkin::text,r.checkout::text,r.status AS reservation_status
    FROM accommodation_units u JOIN housekeeping_status h ON h.tenant_id=u.tenant_id AND h.unit_id=u.id
    LEFT JOIN LATERAL (SELECT id,guest_id,checkin,checkout,status FROM reservations
      WHERE tenant_id=u.tenant_id AND unit_id=u.id AND status IN ('CONFIRMED','IN_STAY')
      AND (checkin<=current_date+1 AND checkout>=current_date)
      ORDER BY checkin LIMIT 1) r ON true
    LEFT JOIN guests g ON g.tenant_id=u.tenant_id AND g.id=r.guest_id
    WHERE u.tenant_id=${actor.tenantId} ORDER BY u.code`),
        ),
    );
    return successJson({ units, lastUpdated: new Date().toISOString() });
  } catch (error) {
    return failResponse(error);
  }
}
