import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { PageHeading } from '@/modules/admin/ui/page-heading';
import { ReservationsTable } from '@/modules/admin/ui/reservations-table';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
import { listReservations } from '@/modules/reservations/application/list-reservations';

export const dynamic = 'force-dynamic';
export default async function AdminReservationsPage() {
  const actor = await requireAdminActor();
  requirePermission(actor.role, 'reservations:read');
  const rows = await listReservations({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorType: 'USER',
  });
  return (
    <>
      <PageHeading
        title="Gestión de reservas"
        subtitle="Consultá, filtrá y gestioná las reservas del complejo."
        action={
          <Link href="/admin/reservas/nueva" className="primary-button">
            Nueva reserva <ArrowRight size={16} />
          </Link>
        }
      />
      <ReservationsTable rows={rows} />
    </>
  );
}
