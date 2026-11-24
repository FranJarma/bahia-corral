import { sql } from 'drizzle-orm';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
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
        await tx.execute(sql`
 SELECT id,contact_name,email,phone,event_type,status,notes FROM event_inquiries WHERE tenant_id=${actor.tenantId} ORDER BY created_at DESC LIMIT 100`),
      ),
  );
  return (
    <>
      <PageHeading
        title="Consultas de eventos"
        subtitle="Seguimiento básico de presupuestos solicitados por los visitantes"
      />
      <div className="grid gap-4">
        {rows.map((r) => (
          <article key={r.id} className="surface-card p-6">
            <div className="flex justify-between gap-3">
              <h2 className="editorial text-xl">{r.contact_name}</h2>
              <span className="text-xs font-semibold uppercase text-brand">{r.status}</span>
            </div>
            <p className="mt-2 text-sm">
              {r.event_type} · {r.email} · {r.phone}
            </p>
            <p className="mt-2 text-sm text-muted">{r.notes ?? 'Sin comentarios'}</p>
          </article>
        ))}
        {!rows.length && (
          <p className="surface-card p-8 text-muted">Todavía no hay consultas de eventos.</p>
        )}
      </div>
    </>
  );
}
