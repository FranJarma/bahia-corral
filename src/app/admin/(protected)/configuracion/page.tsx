import { sql } from 'drizzle-orm';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { TeamManagement } from '@/modules/admin/ui/team-management';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export const dynamic = 'force-dynamic';

type MemberRow = {
  id: string;
  email: string;
  role: 'OWNER' | 'STAFF' | 'CLEANING';
  active: boolean;
};

export default async function ConfigurationPage() {
  const actor = await requireAdminActor();
  requirePermission(actor.role, 'team:manage');
  const members = await runTenantTx(
    { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
    async (tx) =>
      resultRows<MemberRow>(
        await tx.execute(sql`
      SELECT m.id,u.email,m.role,m.active FROM memberships m
      JOIN "user" u ON u.id=m.user_id
      WHERE m.tenant_id=${actor.tenantId} ORDER BY m.active DESC,m.role,u.email
    `),
      ),
  );
  return (
    <div className="space-y-7">
      <PageHeading
        title="Configuración"
        subtitle="Gestioná los accesos del equipo y la operación del complejo"
      />
      <TeamManagement members={members} />
      <section className="surface-card p-6">
        <h2 className="editorial text-xl">Seguridad y permisos</h2>
        <p className="mt-2 text-sm text-muted">
          Las cuentas son personales. Los cambios de permisos y bajas quedan registrados. El
          personal de limpieza no puede acceder a cobros ni a datos personales de huéspedes.
        </p>
      </section>
    </div>
  );
}
