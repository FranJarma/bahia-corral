import { sql } from 'drizzle-orm';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { AdminRecordsTable } from '@/modules/admin/ui/admin-records-table';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export default async function GuestsPage() {
  const actor = await requireAdminActor();
  requirePermission(actor.role, 'reservations:read');
  const guests = await runTenantTx(
    { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
    async (tx) =>
      resultRows<{
        id: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string;
      }>(
        await tx.execute(
          sql`SELECT id,first_name,last_name,email,phone FROM guests WHERE tenant_id=${actor.tenantId} ORDER BY created_at DESC LIMIT 200`,
        ),
      ),
  );
  const rows = guests.map((g) => ({
    id: g.id,
    name: `${g.first_name} ${g.last_name}`,
    email: g.email ?? 'No informado',
    phone: g.phone,
  }));
  return (
    <>
      <PageHeading
        title="Gestión de huéspedes"
        subtitle="Consultá la información de contacto de los huéspedes registrados."
      />
      <AdminRecordsTable
        rows={rows}
        columns={[
          { key: 'name', label: 'Huésped', weight: 'bold' },
          { key: 'email', label: 'Correo electrónico' },
          { key: 'phone', label: 'Teléfono' },
        ]}
        emptyMessage="Aún no hay huéspedes registrados."
        searchPlaceholder="Buscar por nombre, correo o teléfono"
      />
    </>
  );
}
