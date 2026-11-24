import { sql } from 'drizzle-orm';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { EventInquiriesTable } from '@/modules/admin/ui/event-inquiries-table';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export default async function EventsAdminPage() {
  const actor = await requireAdminActor();
  requirePermission(actor.role, 'events:manage');
  const rows = await runTenantTx(
    { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
    async (tx) =>
      resultRows<{
        id: string;
        contact_name: string;
        email: string;
        phone: string;
        event_type: string;
        status: string;
        notes: string | null;
      }>(
        await tx.execute(
          sql`SELECT id,contact_name,email,phone,event_type,status,notes FROM event_inquiries WHERE tenant_id=${actor.tenantId} ORDER BY created_at DESC LIMIT 100`,
        ),
      ),
  );
  return (
    <>
      <PageHeading
        title="Gestión de eventos"
        subtitle="Hacé seguimiento de las consultas recibidas y contactá a cada interesado."
      />
      <EventInquiriesTable initial={rows} />
    </>
  );
}
