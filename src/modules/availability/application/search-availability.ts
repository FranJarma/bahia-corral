import { sql } from 'drizzle-orm';

import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import { releaseExpiredHolds } from '@/modules/availability/application/holds';
import { stayDates } from '@/modules/pricing/domain/pricing-engine';

export type AvailableUnit = {
  id: string;
  slug: string;
  name: string;
  type: string;
  capacity_total: number;
  min_amount_cents: string;
};
export async function searchAvailability(
  ctx: TenantContext,
  input: { checkin: string; checkout: string; guests: number },
) {
  stayDates(input.checkin, input.checkout);
  if (!Number.isInteger(input.guests) || input.guests < 1)
    throw new Error('Cantidad de huéspedes inválida');
  await releaseExpiredHolds(ctx);
  return runTenantTx(ctx, async (tx) =>
    resultRows<AvailableUnit>(
      await tx.execute(sql`
    SELECT u.id,u.slug,u.name,u.type,u.capacity_total,MIN(b.amount_cents)::text AS min_amount_cents
    FROM accommodation_units u JOIN base_rates b ON b.tenant_id=u.tenant_id AND b.unit_id=u.id
    WHERE u.tenant_id=${ctx.tenantId} AND u.published=true AND u.operational_status='ACTIVE'
    AND u.capacity_total>=${input.guests}
    AND b.min_guests<=${input.guests} AND b.max_guests>=${input.guests}
    AND NOT EXISTS(SELECT 1 FROM inventory_allocations a
      WHERE a.tenant_id=u.tenant_id AND a.unit_id=u.id AND a.active=true
      AND daterange(a.checkin,a.checkout,'[)') && daterange(${input.checkin}::date,${input.checkout}::date,'[)'))
    GROUP BY u.id ORDER BY u.code
  `),
    ),
  );
}
