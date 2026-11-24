import { sql } from 'drizzle-orm';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { RatesTable } from '@/modules/admin/ui/rates-table';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
export default async function RatesPage() {
  const actor = await requireAdminActor();
  requirePermission(actor.role, 'pricing:write');
  const rates = await runTenantTx(
    { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
    async (tx) =>
      resultRows<{
        unit_id: string;
        name: string;
        capacity_total: number;
        min_guests: number;
        max_guests: number;
        amount_cents: string;
      }>(
        await tx.execute(
          sql`SELECT u.id as unit_id,u.name,u.capacity_total,b.min_guests,b.max_guests,b.amount_cents::text FROM base_rates b JOIN accommodation_units u ON u.tenant_id=b.tenant_id AND u.id=b.unit_id WHERE b.tenant_id=${actor.tenantId} ORDER BY u.code,b.min_guests`,
        ),
      ),
  );
  return (
    <>
      <PageHeading
        title="Tarifas de alojamiento"
        subtitle="Programá precios por ocupación. Cada reserva conserva la tarifa aceptada al contratar."
      />
      <RatesTable initial={rates} />
    </>
  );
}
