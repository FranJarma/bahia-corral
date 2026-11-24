import { NewReservationForm } from '@/modules/admin/ui/new-reservation-form';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
export default async function NewReservationPage() {
  const actor = await requireAdminActor();
  requirePermission(actor.role, 'reservations:write');
  return (
    <>
      <PageHeading
        title="Nueva reserva"
        subtitle="Registrá una llamada y protegé la disponibilidad de la cabaña"
      />
      <NewReservationForm />
    </>
  );
}
