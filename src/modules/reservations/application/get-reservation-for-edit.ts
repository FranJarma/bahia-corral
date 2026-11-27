import 'server-only';

import { sql } from 'drizzle-orm';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import type { AdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export type ReservationEditDetails = {
  unitId: string;
  checkin: string;
  checkout: string;
  adults: number;
  childAges: number[];
  status: string;
};
export async function getReservationForEdit(
  actor: AdminActor,
  id: string,
): Promise<ReservationEditDetails | undefined> {
  requirePermission(actor.role, 'reservations:read');
  return runTenantTx(
    { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
    async (tx) => {
      return resultRows<ReservationEditDetails>(
        await tx.execute(sql`
      SELECT unit_id AS "unitId",checkin::text,checkout::text,adults,child_ages AS "childAges",status
      FROM reservations WHERE tenant_id=${actor.tenantId} AND id=${id}
    `),
      )[0];
    },
  );
}
