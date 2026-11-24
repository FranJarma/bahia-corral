import { CalendarView } from '@/modules/admin/ui/calendar-view';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
export default async function AdminCalendarPage() {
  const actor = await requireAdminActor();
  requirePermission(actor.role, 'reservations:read');
  return (
    <>
      <PageHeading
        title="Calendario de ocupación"
        subtitle="Consultá reservas y bloqueos de los seis alojamientos"
      />
      <CalendarView />
    </>
  );
}
